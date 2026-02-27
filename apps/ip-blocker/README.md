# IP Blocker App

NestJS tabanlı IP blocker servisi; nginx access log satırlarını izler, şüpheli URL denemelerinde IP'yi süreli banlar ve aktif ban durumunu MongoDB'de tutar.

## Environment Variables

- `IP_BLOCKER_MONGODB_URI` (default: `mongodb://localhost:27017/ip-blocker`)
- `IP_BLOCKER_PORT` (default: `3000`)
- `IP_BLOCKER_ACCESS_LOG_PATH` (fallback: `NGINX_ACCESS_LOG_PATH`)
- `IP_BLOCKER_FIREWALL_ENABLED` (default: `true`)
- `IP_BLOCKER_LOG_WATCHER_ENABLED` (default: `true`)
- `IP_BLOCKER_STARTUP_SYNC_ENABLED` (default: `true`)
- `IP_BLOCKER_LOG_READ_DEBOUNCE_MS` (default: `100`)

## API Endpoints

Base path: `/ip-blocker`

- `GET /ip-blocker/health`
- `GET /ip-blocker/bans`
- `POST /ip-blocker/ban`
  - body: `{ "ipAddress": "1.2.3.4", "reason": "manual" }`
- `POST /ip-blocker/unban`
  - body: `{ "ipAddress": "1.2.3.4" }`

## Notes

- Ban süresi formülü: `point^2 * 5 saniye` (max `7 gün`).
- Şüpheli URL listesi kod içinde sabit tutulur.
- `iptables` çağrıları için runtime ortamında gerekli yetkiler (örn. `CAP_NET_ADMIN`) bulunmalıdır.
