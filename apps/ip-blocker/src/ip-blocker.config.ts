const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value == null) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  return !(normalized === 'false' || normalized === '0' || normalized === 'off');
};

const parseNumber = (value: string | undefined, defaultValue: number): number => {
  if (value == null) {
    return defaultValue;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

export interface IpBlockerConfig {
  mongodbUri: string;
  port: number;
  accessLogPath?: string;
  firewallEnabled: boolean;
  logWatcherEnabled: boolean;
  startupSyncEnabled: boolean;
  logReadDebounceMs: number;
}

export const getIpBlockerConfig = (): IpBlockerConfig => ({
  mongodbUri:
    process.env['IP_BLOCKER_MONGODB_URI'] ??
    'mongodb://localhost:27017/ip-blocker',
  port: parseNumber(process.env['IP_BLOCKER_PORT'] ?? process.env['port'], 3000),
  accessLogPath:
    process.env['IP_BLOCKER_ACCESS_LOG_PATH'] ?? process.env['NGINX_ACCESS_LOG_PATH'],
  firewallEnabled: parseBoolean(process.env['IP_BLOCKER_FIREWALL_ENABLED'], true),
  logWatcherEnabled: parseBoolean(process.env['IP_BLOCKER_LOG_WATCHER_ENABLED'], true),
  startupSyncEnabled: parseBoolean(process.env['IP_BLOCKER_STARTUP_SYNC_ENABLED'], true),
  logReadDebounceMs: parseNumber(process.env['IP_BLOCKER_LOG_READ_DEBOUNCE_MS'], 100),
});
