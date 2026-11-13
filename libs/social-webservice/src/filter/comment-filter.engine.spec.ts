import {
    compilePattern,
    evaluatePatterns,
    normalizeText,
    validatePatternSource,
    FilterPatternSource,
} from './comment-filter.engine';

const p = (o: Partial<FilterPatternSource>): FilterPatternSource => ({
    _id: Math.random().toString(),
    pattern: 'x',
    type: 'STRING',
    flag: 'f',
    action: 'FLAG_ONLY',
    ...o,
});
const run = (patterns: FilterPatternSource[], text: string, group?: string) =>
    evaluatePatterns(patterns.map(compilePattern), text, group);

describe('normalizeText', () => {
    it('folds Turkish characters and case', () => {
        expect(normalizeText('ŞİŞLİ ığdır Çöl').normalized).toBe(
            'sisli igdir col',
        );
    });
    it('compact handles punctuation, spacing and leet', () => {
        expect(normalizeText('T.a y-y_1 p').compact).toBe('tayyip');
        expect(normalizeText('t4yy1p').compact).toBe('tayyip');
    });
    it('strips zero-width characters', () => {
        expect(normalizeText('ta​yyip').normalized).toBe('tayyip');
    });
});

describe('evaluatePatterns', () => {
    it('STRING matches whole words only', () => {
        const pats = [p({ pattern: 'sik', flag: 'x' })];
        expect(run(pats, 'sik').flags).toEqual(['x']);
        expect(run(pats, 'basik kisi').flags).toEqual([]);
        expect(run(pats, 'sikke').flags).toEqual([]);
    });
    it('STRING phrase and Turkish folding', () => {
        const pats = [p({ pattern: 'Çok Kötü Adam', flag: 'ph' })];
        expect(run(pats, 'o cok kotu adam!').flags).toEqual(['ph']);
    });
    it('obfuscationResistant catches spaced out words', () => {
        const strict = [p({ pattern: 'tayyip' })];
        const resistant = [p({ pattern: 'tayyip', obfuscationResistant: true })];
        expect(run(strict, 't.a.y.y.i.p').flags).toEqual([]);
        expect(run(resistant, 't.a.y.y.i.p').flags).toEqual(['f']);
    });
    it('REGEX runs on normalized text', () => {
        const pats = [p({ type: 'REGEX', pattern: 'suriye?li\\w* (sov|oldur)' })];
        expect(run(pats, 'Suriyelileri SÖV').flags).toEqual(['f']);
        expect(run(pats, 'Suriye tarihi anlatiyorum').flags).toEqual([]);
    });
    it('most severe action wins and flags merge', () => {
        const pats = [
            p({ pattern: 'a', flag: 'fa', action: 'SHADOW' }),
            p({ pattern: 'b', flag: 'fb', action: 'REJECT_ERROR' }),
            p({ pattern: 'c', flag: 'fc', action: 'FLAG_ONLY' }),
        ];
        const d = run(pats, 'a b c');
        expect(d.action).toBe('REJECT_ERROR');
        expect(d.flags.sort()).toEqual(['fa', 'fb', 'fc']);
    });
    it('BAN_USER keeps the longest ban duration', () => {
        const pats = [
            p({ pattern: 'a', action: 'BAN_USER', banDurationHours: 1 }),
            p({ pattern: 'b', action: 'BAN_USER', banDurationHours: 48 }),
        ];
        expect(run(pats, 'a b').banDurationHours).toBe(48);
    });
    it('PENALTY_POINT is counted and does not block', () => {
        const d = run([p({ pattern: 'a', action: 'PENALTY_POINT' })], 'a');
        expect(d.penaltyPoints).toBe(1);
        expect(d.action).toBe('PENALTY_POINT');
    });
    it('respects entityGroup scope, global matches everywhere', () => {
        const pats = [
            p({ pattern: 'a', flag: 'scoped', entityGroup: 'LOTUS_QB' }),
            p({ pattern: 'a', flag: 'global' }),
        ];
        expect(run(pats, 'a', 'LOTUS_QB').flags.sort()).toEqual([
            'global',
            'scoped',
        ]);
        expect(run(pats, 'a', 'OTHER').flags).toEqual(['global']);
    });
    it('returns empty decision with no match', () => {
        const d = run([p({ pattern: 'zzz' })], 'merhaba');
        expect(d).toEqual({ flags: [], action: 'FLAG_ONLY', penaltyPoints: 0 });
    });
});

describe('validatePatternSource', () => {
    it('rejects unsafe / invalid regex', () => {
        expect(validatePatternSource(p({ type: 'REGEX', pattern: '(a+)+$' }))).toBe(
            'regex-unsafe',
        );
        expect(validatePatternSource(p({ type: 'REGEX', pattern: '(' }))).toBe(
            'regex-invalid',
        );
    });
    it('requires ban duration for BAN_USER', () => {
        expect(validatePatternSource(p({ action: 'BAN_USER' }))).toBe(
            'ban-duration-required',
        );
        expect(
            validatePatternSource(p({ action: 'BAN_USER', banDurationHours: 24 })),
        ).toBeNull();
    });
    it('accepts a normal pattern', () => {
        expect(validatePatternSource(p({ pattern: 'merhaba' }))).toBeNull();
    });
});
