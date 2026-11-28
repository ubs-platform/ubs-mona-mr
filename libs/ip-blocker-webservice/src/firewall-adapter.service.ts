import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { isIP } from 'net';
import { promisify } from 'util';
import { getIpBlockerConfig } from './ip-blocker.config';

const execFileAsync = promisify(execFile);

@Injectable()
export class FirewallAdapterService {
  private readonly logger = new Logger(FirewallAdapterService.name);
  private readonly config = getIpBlockerConfig();

  async banIp(ipAddress: string): Promise<void> {
    await this.runIptables(['-I', 'FORWARD', '-s', ipAddress, '-j', 'DROP']);
  }

  async unbanIp(ipAddress: string): Promise<void> {
    await this.runIptables(['-D', 'FORWARD', '-s', ipAddress, '-j', 'DROP']);
  }

  /**
   * Runs iptables without a shell and only for a literal IPv4 address: the
   * address can come from an admin request, and this process runs with
   * NET_ADMIN on the host network.
   */
  private async runIptables(args: string[]): Promise<void> {
    const ipAddress = args[args.indexOf('-s') + 1];
    if (isIP(ipAddress) !== 4) {
      this.logger.warn(`Refusing iptables for non-IPv4 address: ${JSON.stringify(ipAddress)}`);
      return;
    }

    const command = `iptables ${args.join(' ')}`;
    if (!this.config.firewallEnabled) {
      this.logger.log(`Firewall disabled, skipped: ${command}`);
      return;
    }

    try {
      const { stdout, stderr } = await execFileAsync('iptables', args);
      if (stdout) {
        this.logger.log(stdout.trim());
      }
      if (stderr) {
        this.logger.warn(stderr.trim());
      }
    } catch (error: any) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`iptables command failed (${command}): ${message}`);
    }
  }
}
