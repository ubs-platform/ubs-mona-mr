/**
 * Pattern eşleşince yapılacak aksiyon.
 * Birden fazla pattern eşleşirse en ağır olan kazanır (aşağıdaki sıra, ağırdan hafife):
 * BAN_USER > REJECT_ERROR > DROP > SHADOW > (PENALTY_POINT | FLAG_ONLY)
 *
 * - FLAG_ONLY:     Sadece flag ekler, yorum normal yayınlanır.
 * - PENALTY_POINT: Yorum yayınlanır ve kullanıcıya ceza puanı yazılması için işaretlenir.
 *                  TODO: puan mantığı user serviste yapılacak, burada sadece enum ve hook var.
 * - SHADOW:        Yorum kaydedilir ama sadece yazarına ve moderatöre görünür; süre dolunca silinir.
 * - DROP:          200 döner ama hiçbir şey kaydedilmez ve loglanmaz.
 * - REJECT_ERROR:  Hata fırlatır, kayıt yok.
 * - BAN_USER:      Süreli yorum yasağı koyar ve yorumu kaydetmez.
 */
export type CommentFilterAction =
    | 'FLAG_ONLY'
    | 'PENALTY_POINT'
    | 'SHADOW'
    | 'DROP'
    | 'REJECT_ERROR'
    | 'BAN_USER';

export const COMMENT_FILTER_ACTIONS: CommentFilterAction[] = [
    'FLAG_ONLY',
    'PENALTY_POINT',
    'SHADOW',
    'DROP',
    'REJECT_ERROR',
    'BAN_USER',
];

export type CommentFilterPatternType = 'REGEX' | 'STRING';

export type CommentModerationStatus = 'VISIBLE' | 'SHADOW';

export class CommentFilterPatternAddDTO {
    /** REGEX ise normalize edilmiş (küçük harf, ascii) metne uygulanır. STRING ise tam kelime/ifade eşleşir. */
    pattern: string;
    type: CommentFilterPatternType;
    /** Eşleşen yoruma eklenecek flag */
    flag: string;
    action: CommentFilterAction;
    /** Sadece BAN_USER için zorunlu: ban süresi (saat) */
    banDurationHours?: number;
    /** Boşsa tüm entityGroup'larda geçerli (global) */
    entityGroup?: string;
    /** STRING için: "t.a.y.y.i.p" gibi aralara karakter konulan yazımları da yakalar. Yanlış pozitif riski artar. */
    obfuscationResistant?: boolean;
    enabled?: boolean;
    note?: string;
}

export class CommentFilterPatternDTO extends CommentFilterPatternAddDTO {
    _id: string;
    enabled: boolean;
}

export class CommentFlagEditDTO {
    add?: string[];
    remove?: string[];
}

export class CommentModerationSearchDTO {
    /** virgülle ayrılmış flag listesi (herhangi biri) */
    flags?: string;
    moderationStatus?: CommentModerationStatus;
    entityGroup?: string;
}
