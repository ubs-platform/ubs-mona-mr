# Yorum Moderasyonu (social-webservice)

Yorumlar kaydedilmeden önce admin tarafından tanımlanan **pattern**'lere karşı kontrol edilir.
Kod: `libs/social-webservice/src/filter/comment-filter.engine.ts` (saf motor),
`service/comment-filter.service.ts` (pattern CRUD + cache), `service/comment-moderation.service.ts` (moderatör işlemleri),
`service/comment.service.ts` (`insertComment` / `editComment` entegrasyonu).

## Flag ve aksiyon ayrı kavramlardır

- **Flag**: Yorum üzerindeki etikettir (`SocialComment.flags`). Sadece moderatöre/admine görünür, tek başına ceza değildir.
  Aynı kelimeler zararsız bağlamda da geçebileceği için varsayılan aksiyon `FLAG_ONLY`'dir.
- **Aksiyon**: Pattern eşleşince yapılacak şey. Birden fazla eşleşmede en ağırı kazanır, flag'ler birleşir.

| Aksiyon | Davranış |
|---|---|
| `FLAG_ONLY` | Flag ekler, yorum normal yayınlanır |
| `PENALTY_POINT` | Yorum yayınlanır, ceza puanı için işaretlenir. **TODO:** puan mantığı user serviste (`applyFilterDecision` içindeki hook) |
| `SHADOW` | Kaydedilir; yalnızca yazarı ve moderatör görür, sayaçlara girmez. `shadowExpiresAt` (TTL index) dolunca Mongo siler |
| `DROP` | 200 döner, **hiçbir şey kaydedilmez ve loglanmaz** |
| `REJECT_ERROR` | `BadRequestException` |
| `BAN_USER` | `ApplicationSocialRestriction` ile süreli (`banDurationHours`, zorunlu) `COMMENT` yasağı, yorum kaydedilmez. Çok dar pattern'ler için |

Öncelik: `BAN_USER > REJECT_ERROR > DROP > SHADOW > PENALTY_POINT > FLAG_ONLY`.

## Gizlilik

- Yorum metni filtre kodunda hiçbir yere yazılmaz/loglanmaz; ayrıca log koleksiyonu yoktur.
- Shadow yorumlar `SOCIAL_SHADOW_RETENTION_DAYS` (varsayılan 30) gün sonra silinir.
  Moderatör `PUT comment/admin/:id/shadow/keep` ile silinmesini durdurabilir (ör. aimoderator verisi),
  `PUT comment/admin/:id/shadow/release` ile yanlış pozitifi yayınlayabilir.
- Shadow yoruma gelen cevap da shadow olur.
- Ban notu sabit `auto-moderation`'dır, yorum içeriği içermez.

## Pattern'ler

- `type: STRING`: tam kelime/ifade eşleşir. `obfuscationResistant: true` ise `t.a.y.y.i.p`, `t4yy1p` gibi yazımlar da yakalanır (yanlış pozitif riski artar).
- `type: REGEX`: **normalize edilmiş** metne uygulanır (küçük harf, `ç→c ğ→g ı→i ö→o ş→s ü→u`, aksansız, noktalama boşluk). Pattern'i buna göre yaz.
- Kaydederken `safe-regex2` ile ReDoS kontrolü yapılır, uzunluk 500 ile sınırlıdır; çok uzun yorumlar ilk 10.000 karakterle değerlendirilir.
- `entityGroup` boşsa pattern globaldir.
- Pattern'ler 60 sn bellekte cache'lenir; CRUD sonrası ilgili instance'ta hemen yenilenir, diğer instance'lar TTL ile yakalar.
- Düzenlemede (`editComment`) de filtre çalışır; `DROP` düzenlemeyi uygulamadan eski yorumu döner.

## Admin endpoint'leri (`UBS-SOCIAL:MODERATOR` veya `ADMIN`)

| Endpoint | Açıklama |
|---|---|
| `GET/POST comment/admin/filter-pattern`, `PUT/DELETE .../:id` | Pattern CRUD |
| `GET comment/admin/flagged?flags=a,b&moderationStatus=SHADOW&entityGroup=..&page&size` | Flag'li/shadow yorumlar (aimoderator için de uygun) |
| `PUT comment/admin/:id/flags` `{add, remove}` | Manuel flag |
| `PUT comment/admin/:id/shadow/keep` / `release` | Sakla / yayınla |
| `DELETE comment/admin/:id` | Moderatör silme |

Normal `GET comment` aramasında `flags` parametresi sadece moderatör için çalışır; `flags` ve `moderationStatus` alanları `CommentDTO`'ya sadece moderatöre doldurulur.
