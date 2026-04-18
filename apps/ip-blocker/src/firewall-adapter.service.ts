import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getIpBlockerConfig } from './ip-blocker.config';

const execAsync = promisify(exec);

@Injectable()
export class FirewallAdapterService {
  private readonly logger = new Logger(FirewallAdapterService.name);
  private readonly config = getIpBlockerConfig();

  async banIp(ipAddress: string): Promise<void> {
    await this.runIptables(`iptables -I FORWARD -s ${ipAddress} -j DROP`);
  }

  async unbanIp(ipAddress: string): Promise<void> {
    await this.runIptables(`iptables -D FORWARD -s ${ipAddress} -j DROP`);
  }

  private async runIptables(command: string): Promise<void> {
    if (!this.config.firewallEnabled) {
      this.logger.log(`Firewall disabled, skipped: ${command}`);
      return;
    }

    try {
      const { stdout, stderr } = await execAsync(command);
      if (stdout) {
        this.logger.log(stdout.trim());
      }
      if (stderr) {
        this.logger.warn(stderr.trim());
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`iptables command failed (${command}): ${message}`);
    }
  }
}
