# IP Blocker Taşıma Sözleşmesi (MVP)

Bu doküman, `nginx-ip-blocker` uygulamasındaki davranışın `users-mona-mr/apps/ip-blocker` içine NestJS + MongoDB ile taşınması için minimum kapsamı ve kabul kriterlerini tanımlar.

## 1) Amaç

- Nginx access log satırlarını izlemek.
- Şüpheli URL erişimlerinde IP ceza puanı üretmek.
- Ceza eşiği aşılınca IP'yi süreli banlamak.
- Durumu dosya yerine MongoDB'de kalıcı tutmak.

## 2) MVP Kapsamı

### Dahil

1. Log izleme:
   - Tek bir access log dosyası izlenir.
   - Dosya değişiminde son satır parse edilir.
2. Karar motoru:
   - Şüpheli istekte puan artar.
   - Normal istekte puan düşer (0 altına inmez).
   - Ceza süresi formülü: `point^2 * 5 saniye`.
   - Ceza üst sınırı: `7 gün`.
3. Kalıcılık:
   - Sadece aktif ban kayıtları MongoDB'de tutulur.
4. Firewall aksiyonu:
   - Ban/unban için iptables çağrısı yapılır.
5. Yaşam döngüsü:
   - Nest başlarken watcher başlar.
   - Nest kapanırken watcher temiz kapatılır.

### Hariç (Phase-2)

- Admin API (`list/ban/unban/health`).
- Startup sırasında geçmiş banlardan full senkronizasyon.
- Pattern listesinin DB/ENV üzerinden dinamik yönetimi.
- Gelişmiş metrik ve audit event geçmişi.

## 3) Sabit Kurallar

- Şüpheli URL/pattern listesi kod içinde sabit tutulur.
- Persistence modeli: yalnızca aktif ban dokümanı.
- Ban kararı, mevcut kaynak davranışını bozmayacak şekilde taşınır.

## 4) Veri Modeli (MVP)

`active_bans` koleksiyonu için minimum alanlar:

- `ipAddress` (string, unique)
- `point` (number)
- `reason` (string)
- `penalizedAt` (date)
- `releaseAt` (date)
- `lastSeenAt` (date)
- `status` (`active` | `released`)

Önerilen indexler:

- `{ ipAddress: 1 }` unique
- `{ status: 1, releaseAt: 1 }`

## 5) Davranış Sözleşmesi

1. Parse edilen satır şüpheli ise:
   - IP kaydı bulunur veya oluşturulur.
   - `point` artırılır.
   - Yeni `releaseAt` hesaplanır.
   - İptables ban aksiyonu uygulanır.
   - Kayıt `active` olarak güncellenir.
2. Parse edilen satır normal ise:
   - IP kaydı varsa `point` azaltılır.
   - `point=0` durumunda aktif ceza yoksa ban uygulanmaz.
3. Ceza süresi dolduğunda:
   - Unban aksiyonu uygulanır.
   - Kayıt `released` durumuna çekilir.

## 6) Acceptance Criteria (CARD-01)

Aşağıdakiler sağlanınca CARD-01 tamamlanmış kabul edilir:

1. Kapsam/dahil-hariç net olarak dokümante edilmiştir.
2. Ceza formülü ve üst sınır yazılı olarak sabitlenmiştir.
3. Mongo'da tutulacak minimum alanlar belirlenmiştir.
4. Ban/unban karar akışı adım adım tanımlanmıştır.
5. MVP ve Phase-2 sınırı net ayrılmıştır.

## 7) Risk Notları

- iptables çağrısı için çalışma ortamında yetki (örn. `CAP_NET_ADMIN`) gerekir.
- Log rotation/truncate durumları MVP dışında ele alınabilir.
- Yanlış pozitifleri azaltmak için whitelist ihtiyacı Phase-2'de değerlendirilecektir.
