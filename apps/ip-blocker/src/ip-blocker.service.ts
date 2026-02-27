import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ActiveBan, ActiveBanDoc, BanStatus } from './model/entity-property.schema';
import { FirewallAdapterService } from './firewall-adapter.service';

const PENALTY_DURATION_BASE_MS = 5000;
const PENALTY_DURATION_MAX_MS = 7 * 24 * 60 * 60 * 1000;

export type ReviewAction = 'penalize' | 'heaven' | 'noop';

export interface ReviewResult {
  action: ReviewAction;
  ipAddress: string;
  point: number;
  status: BanStatus;
  releaseAt?: Date;
  reason: string;
}

export interface HealthResult {
  status: 'ok';
  activeBanCount: number;
  now: string;
}

@Injectable()
export class IpBlockerService implements OnModuleInit {
  private readonly logger = new Logger(IpBlockerService.name);

  constructor(
    @InjectModel(ActiveBan.name)
    private readonly activeBanModel: Model<ActiveBanDoc>,
    private readonly firewallAdapterService: FirewallAdapterService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.syncStartupState();
  }

  private async syncStartupState(): Promise<void> {
    const now = new Date();
    const activeBans = await this.activeBanModel
      .find({ status: BanStatus.Active })
      .sort({ releaseAt: 1 });

    if (!activeBans.length) {
      this.logger.log('Startup sync completed: no active bans found.');
      return;
    }

    for (const ban of activeBans) {
      if (ban.releaseAt <= now) {
        await this.heaven(ban.ipAddress, false, true, 'expired-on-startup');
        await this.firewallAdapterService.unbanIp(ban.ipAddress);
        continue;
      }

      await this.firewallAdapterService.banIp(ban.ipAddress);
    }

    this.logger.log(
      `Startup sync completed: processed ${activeBans.length} active bans.`,
    );
  }

  async reviewIncoming(ipAddress: string, urlPath: string): Promise<ReviewResult> {
    const normalizedIp = (ipAddress ?? '').trim();
    const normalizedPath = urlPath ?? '';

    if (!normalizedIp) {
      return {
        action: 'noop',
        ipAddress: '',
        point: 0,
        status: BanStatus.Released,
        reason: 'invalid-ip',
      };
    }

    if (this.isSuspiciousUrl(normalizedPath)) {
      const penalized = await this.penalize(normalizedIp, normalizedPath);
      await this.applyFirewallAction(penalized);
      return penalized;
    }

    const released = await this.heaven(normalizedIp, true);
    await this.applyFirewallAction(released);
    return released;
  }

  async getActiveBans(): Promise<ActiveBan[]> {
    return this.activeBanModel
      .find({ status: BanStatus.Active })
      .sort({ releaseAt: 1 })
      .lean();
  }

  async banManually(ipAddress: string, reason?: string): Promise<ReviewResult> {
    const normalizedReason = reason?.trim() || 'manual-ban';
    const result = await this.penalize(ipAddress, normalizedReason, 'manual');
    await this.applyFirewallAction(result);
    return result;
  }

  async unbanManually(ipAddress: string): Promise<ReviewResult> {
    const result = await this.heaven(ipAddress, false, true, 'manual-unban');
    await this.applyFirewallAction(result);
    return result;
  }

  async getHealth(): Promise<HealthResult> {
    const activeBanCount = await this.activeBanModel.countDocuments({
      status: BanStatus.Active,
    });

    return {
      status: 'ok',
      activeBanCount,
      now: new Date().toISOString(),
    };
  }

  private async applyFirewallAction(result: ReviewResult): Promise<void> {
    if (result.action === 'penalize') {
      await this.firewallAdapterService.banIp(result.ipAddress);
      return;
    }

    if (result.action === 'heaven') {
      await this.firewallAdapterService.unbanIp(result.ipAddress);
    }
  }

  private async penalize(
    ipAddress: string,
    urlPath: string,
    source: 'traffic' | 'manual' = 'traffic',
  ): Promise<ReviewResult> {
    const now = new Date();
    const existing = await this.activeBanModel.findOne({ ipAddress });
    const nextPoint = (existing?.point ?? 0) + 1;
    const penaltyDurationMs = this.computePenaltyDurationMs(nextPoint);
    const releaseAt = new Date(now.getTime() + penaltyDurationMs);

    const saved = await this.activeBanModel.findOneAndUpdate(
      { ipAddress },
      {
        $set: {
          point: nextPoint,
          status: BanStatus.Active,
          penalizedAt: now,
          releaseAt,
          reason:
            source === 'traffic'
              ? `suspicious-url:${urlPath}`
              : `manual:${urlPath}`,
          lastSeenAt: now,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return {
      action: 'penalize',
      ipAddress,
      point: saved?.point ?? nextPoint,
      status: saved?.status ?? BanStatus.Active,
      releaseAt: saved?.releaseAt ?? releaseAt,
      reason: source === 'traffic' ? 'suspicious-traffic' : 'manual-ban',
    };
  }

  private async heaven(
    ipAddress: string,
    decreasePenaltyPoint: boolean,
    forceRelease = false,
    reason = 'innocent-traffic',
  ): Promise<ReviewResult> {
    const existing = await this.activeBanModel.findOne({ ipAddress });

    if (!existing || (existing.point <= 0 && !forceRelease)) {
      return {
        action: 'noop',
        ipAddress,
        point: existing?.point ?? 0,
        status: existing?.status ?? BanStatus.Released,
        releaseAt: existing?.releaseAt,
        reason: 'no-active-penalty',
      };
    }

    const now = new Date();
    const nextPoint = decreasePenaltyPoint
      ? Math.max(existing.point - 1, 0)
      : existing.point;

    existing.point = nextPoint;
    existing.status = BanStatus.Released;
    existing.releaseAt = now;
    existing.lastSeenAt = now;
    existing.reason = reason;

    const saved = await existing.save();

    return {
      action: 'heaven',
      ipAddress,
      point: saved.point,
      status: saved.status,
      releaseAt: saved.releaseAt,
      reason,
    };
  }

  private computePenaltyDurationMs(point: number): number {
    return Math.min(PENALTY_DURATION_MAX_MS, point * point * PENALTY_DURATION_BASE_MS);
  }

  private isSuspiciousUrl(urlPath: string): boolean {
    if (!urlPath) {
      return false;
    }

    return (
      urlPath.startsWith('/.env') ||
      urlPath.includes('bin/sh') ||
      urlPath.includes(encodeURI('bin/sh')) ||
      urlPath.includes('.php') ||
      urlPath.startsWith('/login.rsp') ||
      urlPath.startsWith('/tests/vendor/phpunit') ||
      urlPath.startsWith('/test/vendor/phpunit') ||
      urlPath.startsWith('/testing/vendor/phpunit') ||
      urlPath.startsWith('/vendor/phpunit') ||
      urlPath.startsWith('/api/vendor/phpunit') ||
      urlPath.startsWith('/demo/vendor/phpunit') ||
      urlPath.startsWith('/containers/json') ||
      urlPath.startsWith('/demo') ||
      urlPath.startsWith('/?XDEBUG_SESSION_START=') ||
      urlPath.startsWith('/cgi-bin') ||
      urlPath.startsWith('/actuator/gateway/routes') ||
      urlPath.startsWith('/.git/config') ||
      urlPath.startsWith('/dns-query') ||
      urlPath.startsWith('/.well-known/acme-challenge/') ||
      urlPath.startsWith('/solr/admin/info/system') ||
      urlPath.startsWith('/manager/html') ||
      urlPath.startsWith('/hudson/') ||
      urlPath.startsWith('/jenkins/') ||
      urlPath.startsWith('/admin-console/') ||
      urlPath.startsWith('/phpmyadmin') ||
      urlPath.startsWith('/pma') ||
      urlPath.startsWith('/mysql') ||
      urlPath.startsWith('/wp-admin') ||
      urlPath.startsWith('/wp-login.php') ||
      urlPath.startsWith('/xmlrpc.php') ||
      urlPath.startsWith('/boaform/admin/formLogin') ||
      urlPath.includes('/etc/passwd') ||
      urlPath.includes('/proc/self/environ') ||
      urlPath.includes('/proc/version') ||
      (urlPath.includes('java.io') && urlPath.includes('FileInputStream')) ||
      (urlPath.includes('java.lang') && urlPath.includes('Runtime')) ||
      (urlPath.includes('javax.script') && urlPath.includes('ScriptEngine')) ||
      urlPath ===
        '\x16\x03\x01\x05\xA8\x01\x00\x05\xA4\x03\x03\xD1\xCE\x91\xBD\x9C?\xA9\x1A\x1BC2\xCB\xC8\xC6\xC7\xB7OG\x0C\x0E\xA1\xAA\x08Y\xD5\xD5t\x069\xD6=L \xC7\xAC\x87'
    );
  }

  async getHello(): Promise<string> {
    const health = await this.getHealth();
    return `IP blocker is alive. Active bans: ${health.activeBanCount}`;
  }
}
