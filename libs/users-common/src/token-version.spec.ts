import { tokenVersionMatches } from './token-version';

describe('tokenVersionMatches', () => {
    it('accepts a token of the current generation', () => {
        expect(tokenVersionMatches({ tv: 3 }, { tokenVersion: 3 })).toBe(true);
    });

    it('rejects a token from an earlier generation', () => {
        expect(tokenVersionMatches({ tv: 2 }, { tokenVersion: 3 })).toBe(false);
    });

    it('treats a missing claim and a missing field as generation 0', () => {
        expect(tokenVersionMatches({}, {})).toBe(true);
        expect(tokenVersionMatches({}, { tokenVersion: 0 })).toBe(true);
        expect(tokenVersionMatches({ tv: 0 }, {})).toBe(true);
    });

    it('rejects a pre-claim token once the user revoked sessions', () => {
        expect(tokenVersionMatches({}, { tokenVersion: 1 })).toBe(false);
    });

    it('rejects when the user is missing', () => {
        expect(tokenVersionMatches({ tv: 0 }, null)).toBe(false);
    });
});
