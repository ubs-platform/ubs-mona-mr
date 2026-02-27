import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import { IpBlockerService } from './ip-blocker.service';
import { parseSingleLine } from './nginx-access-log-regex';

@Injectable()
export class LogWatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LogWatcherService.name);
  private watcher?: fs.FSWatcher;
  private readTimeout?: NodeJS.Timeout;

  constructor(private readonly ipBlockerService: IpBlockerService) {}

  onModuleInit(): void {
    const accessLogPath =
      process.env['IP_BLOCKER_ACCESS_LOG_PATH'] ??
      process.env['NGINX_ACCESS_LOG_PATH'];

    if (!accessLogPath) {
      this.logger.warn(
        'IP_BLOCKER_ACCESS_LOG_PATH not provided, log watcher will stay disabled.',
      );
      return;
    }

    if (!fs.existsSync(accessLogPath)) {
      this.logger.warn(
        `Access log file does not exist at startup: ${accessLogPath}. Watcher will still be attached.`,
      );
    }

    this.watcher = fs.watch(accessLogPath, (eventType) => {
      if (eventType !== 'change') {
        return;
      }

      if (this.readTimeout) {
        clearTimeout(this.readTimeout);
      }

      this.readTimeout = setTimeout(() => {
        this.processLastLine(accessLogPath).catch((error) => {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(`Failed to process access log line: ${message}`);
        });
      }, 100);
    });

    this.logger.log(`Log watcher started for: ${accessLogPath}`);
  }

  onModuleDestroy(): void {
    if (this.readTimeout) {
      clearTimeout(this.readTimeout);
      this.readTimeout = undefined;
    }

    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
    }
  }

  private async processLastLine(accessLogPath: string): Promise<void> {
    const lastLine = await this.readLastLine(accessLogPath);
    if (!lastLine) {
      return;
    }

    const info = parseSingleLine(lastLine);
    if (!info) {
      return;
    }

    await this.ipBlockerService.reviewIncoming(
      info.ip,
      info.isRest ? info.url ?? '' : info.request,
    );
  }

  private async readLastLine(filePath: string): Promise<string | null> {
    const content = await fsPromises.readFile(filePath, { encoding: 'utf-8' });
    const lines = content.split(/\r?\n/);

    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const line = lines[index]?.trim();
      if (line) {
        return line;
      }
    }

    return null;
  }
}
