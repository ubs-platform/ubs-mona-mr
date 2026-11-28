/** JWT claim that carries the user's session generation. */
export const TOKEN_VERSION_CLAIM = 'tv';

/**
 * True when a token's session generation is still current. Tokens issued
 * before the claim existed, and users saved before the field existed, both
 * count as generation 0, so rolling this out logs nobody out.
 */
export function tokenVersionMatches(
    payload: { [TOKEN_VERSION_CLAIM]?: number } | null | undefined,
    user: { tokenVersion?: number } | null | undefined,
): boolean {
    if (!payload || !user) {
        return false;
    }
    return (payload[TOKEN_VERSION_CLAIM] ?? 0) === (user.tokenVersion ?? 0);
}
