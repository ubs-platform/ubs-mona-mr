import { JwtService } from '@nestjs/jwt';
import { createPublicKey, JsonWebKey } from 'crypto';
import { OAuthIdentity, OAuthProvider, OAuthVerifyInput } from './oauth-provider';

export interface OidcProviderConfig {
    name: string;
    /** Accepted `aud` values: this deployment's OAuth client IDs. */
    clientIds: string[];
    /** Accepted `iss` values. */
    issuers: string[];
    jwksUri: string;
    algorithms?: string[];
}

const DEFAULT_JWKS_TTL_MS = 60 * 60 * 1000;
const MIN_JWKS_REFRESH_INTERVAL_MS = 60 * 1000;

/**
 * Verifies OIDC ID tokens against the provider's published signing keys.
 * Subclasses usually only supply configuration and override `toIdentity`.
 */
export class OidcProvider extends OAuthProvider {
    readonly name: string;

    // Deliberately unconfigured: the module's JwtService prefers the local
    // signing secret over a supplied public key.
    private readonly jwt = new JwtService();
    private keys = new Map<string, string>();
    private keysExpireAt = 0;
    private lastFetchAt = 0;

    constructor(protected readonly config: OidcProviderConfig) {
        super();
        this.name = config.name;
    }

    isConfigured(): boolean {
        return this.config.clientIds.length > 0;
    }

    /** The first client ID is the one browsers use. */
    publicInfo() {
        return { name: this.name, clientId: this.config.clientIds[0] };
    }

    async verify(input: OAuthVerifyInput): Promise<OAuthIdentity> {
        if (!this.isConfigured()) {
            throw new Error(`OAuth provider ${this.name} is not configured`);
        }
        const decoded = this.jwt.decode(input.credential, { complete: true }) as
            | { header?: { kid?: string } }
            | null;
        const kid = decoded?.header?.kid;
        if (!kid) {
            throw new Error('Credential has no key id');
        }

        const publicKey = await this.findKey(kid);
        const claims = await this.jwt.verifyAsync<Record<string, unknown>>(
            input.credential,
            {
                publicKey,
                algorithms: (this.config.algorithms ?? ['RS256']) as any,
                issuer: this.config.issuers as [string, ...string[]],
                audience: this.config.clientIds as [string, ...string[]],
            },
        );
        if (typeof claims['sub'] !== 'string' || !claims['sub']) {
            throw new Error('Credential has no subject');
        }
        return this.toIdentity(claims);
    }

    /** Maps standard OIDC claims; override for providers that differ. */
    protected toIdentity(claims: Record<string, unknown>): OAuthIdentity {
        const text = (key: string) =>
            typeof claims[key] === 'string' && claims[key]
                ? (claims[key] as string)
                : undefined;
        return {
            provider: this.name,
            subject: claims['sub'] as string,
            email: text('email')?.toLowerCase(),
            emailVerified:
                claims['email_verified'] === true ||
                claims['email_verified'] === 'true',
            name: text('given_name') ?? text('name'),
            surname: text('family_name'),
            picture: text('picture'),
        };
    }

    private async findKey(kid: string): Promise<string> {
        const now = Date.now();
        const stale = now >= this.keysExpireAt;
        // Refresh an unknown key id at most once a minute so forged ids cannot
        // turn every request into a JWKS fetch.
        const unknown =
            !this.keys.has(kid) &&
            now - this.lastFetchAt >= MIN_JWKS_REFRESH_INTERVAL_MS;
        if (stale || unknown) {
            await this.refreshKeys();
        }
        const key = this.keys.get(kid);
        if (!key) {
            throw new Error('Credential is signed with an unknown key');
        }
        return key;
    }

    private async refreshKeys() {
        this.lastFetchAt = Date.now();
        const response = await fetch(this.config.jwksUri);
        if (!response.ok) {
            throw new Error(`JWKS request failed with ${response.status}`);
        }
        const body = (await response.json()) as {
            keys?: (JsonWebKey & { kid?: string; use?: string })[];
        };
        const keys = new Map<string, string>();
        for (const jwk of body.keys ?? []) {
            if (!jwk.kid || (jwk.use && jwk.use !== 'sig')) {
                continue;
            }
            const pem = createPublicKey({ key: jwk, format: 'jwk' })
                .export({ type: 'spki', format: 'pem' })
                .toString();
            keys.set(jwk.kid, pem);
        }
        this.keys = keys;
        this.keysExpireAt =
            this.lastFetchAt +
            (parseMaxAge(response.headers.get('cache-control')) ??
                DEFAULT_JWKS_TTL_MS);
    }
}

function parseMaxAge(cacheControl: string | null): number | undefined {
    const match = cacheControl?.match(/max-age=(\d+)/);
    return match ? parseInt(match[1], 10) * 1000 : undefined;
}

/** Splits a comma-separated environment value into trimmed, non-empty items. */
export function envList(value: string | undefined): string[] {
    return (value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}
