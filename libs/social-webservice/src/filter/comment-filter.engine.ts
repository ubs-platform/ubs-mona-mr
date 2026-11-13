import safeRegex from 'safe-regex2';
import {
    CommentFilterAction,
    CommentFilterPatternType,
} from '@ubs-platform/social-common';

/**
 * Saf (DB'siz) eşleştirme motoru. Yorum metnini hiçbir yere yazmaz/loglamaz.
 */

export const MAX_PATTERN_LENGTH = 500;
/** Çok uzun yorumlarda regex maliyetini sınırlamak için */
export const MAX_MATCH_TEXT_LENGTH = 10_000;

export interface FilterPatternSource {
    _id?: any;
    pattern: string;
    type: CommentFilterPatternType;
    flag: string;
    action: CommentFilterAction;
    banDurationHours?: number;
    entityGroup?: string;
    obfuscationResistant?: boolean;
}

export interface CompiledPattern {
    id: string;
    flag: string;
    action: CommentFilterAction;
    banDurationHours?: number;
    entityGroup?: string;
    test: (text: NormalizedText) => boolean;
}

export interface NormalizedText {
    /** Küçük harf, ascii'ye indirgenmiş, noktalama boşluğa çevrilmiş, boşluklar tekilleştirilmiş */
    normalized: string;
    /** normalized + leet düzeltmesi, harf/rakam dışı her şey silinmiş (t.a.y.y.i.p -> tayyip) */
    compact: string;
}

export interface FilterDecision {
    flags: string[];
    /** FLAG_ONLY: sadece flag; yoksa ağır aksiyon */
    action: CommentFilterAction;
    banDurationHours?: number;
    penaltyPoints: number;
}

/** Ağırdan hafife. PENALTY_POINT yorum akışını etkilemez, ayrıca sayılır. */
const SEVERITY: CommentFilterAction[] = [
    'BAN_USER',
    'REJECT_ERROR',
    'DROP',
    'SHADOW',
    'PENALTY_POINT',
    'FLAG_ONLY',
];

const TR_FOLD: Record<string, string> = {
    ç: 'c',
    ğ: 'g',
    ı: 'i',
    ö: 'o',
    ş: 's',
    ü: 'u',
};

const LEET: Record<string, string> = {
    '0': 'o',
    '1': 'i',
    '3': 'e',
    '4': 'a',
    '5': 's',
    '7': 't',
    '@': 'a',
    $: 's',
};

export function normalizeText(input: string): NormalizedText {
    let t = (input ?? '').slice(0, MAX_MATCH_TEXT_LENGTH);
    // zero-width / yön karakterleri
    t = t.replace(/[​-‏‪-‮⁠﻿]/g, '');
    t = t.toLocaleLowerCase('tr-TR');
    t = t.replace(/[çğıöşü]/g, (c) => TR_FOLD[c]);
    // kalan aksanlar (é, â ...)
    t = t.normalize('NFKD').replace(/[̀-ͯ]/g, '');
    // leet için @ ve $ noktalama olarak silinmeden önce compact'te işlenecek
    const leetFolded = t.replace(/[013457@$]/g, (c) => LEET[c] ?? c);
    const normalized = t
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const compact = leetFolded.replace(/[^a-z]+/g, '');
    return { normalized, compact };
}

function escapeRegex(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Kaydetmeden önce admin girdisini doğrular. Hata varsa mesaj döner. */
export function validatePatternSource(p: FilterPatternSource): string | null {
    if (!p.pattern || !p.pattern.trim()) return 'pattern-empty';
    if (p.pattern.length > MAX_PATTERN_LENGTH) return 'pattern-too-long';
    if (!p.flag || !p.flag.trim()) return 'flag-empty';
    if (p.type !== 'REGEX' && p.type !== 'STRING') return 'type-invalid';
    if (!SEVERITY.includes(p.action)) return 'action-invalid';
    if (
        p.action === 'BAN_USER' &&
        !(typeof p.banDurationHours === 'number' && p.banDurationHours > 0)
    ) {
        return 'ban-duration-required';
    }
    if (p.type === 'REGEX') {
        try {
            new RegExp(p.pattern, 'u');
        } catch {
            return 'regex-invalid';
        }
        if (!safeRegex(p.pattern)) return 'regex-unsafe';
    } else if (!normalizeText(p.pattern).normalized) {
        return 'pattern-empty';
    }
    return null;
}

export function compilePattern(p: FilterPatternSource): CompiledPattern {
    let test: CompiledPattern['test'];
    if (p.type === 'REGEX') {
        const re = new RegExp(p.pattern, 'u');
        test = (t) => re.test(t.normalized);
    } else {
        const n = normalizeText(p.pattern);
        const re = new RegExp(
            `(?<![a-z0-9])${escapeRegex(n.normalized)}(?![a-z0-9])`,
        );
        const compactNeedle = p.obfuscationResistant ? n.compact : '';
        test = (t) =>
            re.test(t.normalized) ||
            (compactNeedle.length > 0 && t.compact.includes(compactNeedle));
    }
    return {
        id: String(p._id ?? ''),
        flag: p.flag,
        action: p.action,
        banDurationHours: p.banDurationHours,
        entityGroup: p.entityGroup || undefined,
        test,
    };
}

export function evaluatePatterns(
    compiled: CompiledPattern[],
    text: string,
    entityGroup?: string,
): FilterDecision {
    const none: FilterDecision = {
        flags: [],
        action: 'FLAG_ONLY',
        penaltyPoints: 0,
    };
    if (!text || compiled.length === 0) return none;

    const nt = normalizeText(text);
    const flags = new Set<string>();
    let action: CommentFilterAction = 'FLAG_ONLY';
    let banDurationHours: number | undefined;
    let penaltyPoints = 0;

    for (const c of compiled) {
        if (c.entityGroup && c.entityGroup !== entityGroup) continue;
        if (!c.test(nt)) continue;

        flags.add(c.flag);
        if (c.action === 'PENALTY_POINT') penaltyPoints++;
        if (SEVERITY.indexOf(c.action) < SEVERITY.indexOf(action)) {
            action = c.action;
        }
        if (c.action === 'BAN_USER') {
            banDurationHours = Math.max(
                banDurationHours ?? 0,
                c.banDurationHours ?? 0,
            );
        }
    }

    return {
        flags: [...flags],
        action,
        banDurationHours: action === 'BAN_USER' ? banDurationHours : undefined,
        penaltyPoints,
    };
}
