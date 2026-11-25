/// <reference types="jest" />
import { JwtService } from '@nestjs/jwt';
import { generateKeyPairSync, KeyObject } from 'crypto';
import { OidcProvider } from './oidc-provider';

const ISSUER = 'https://issuer.example';
const CLIENT_ID = 'client-1';

function keyPair() {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
    });
    return { publicKey, privateKey };
}

function jwks(kid: string, publicKey: KeyObject) {
    return { keys: [{ ...publicKey.export({ format: 'jwk' }), kid, use: 'sig' }] };
}

function sign(
    privateKey: KeyObject,
    kid: string,
    payload: Record<string, unknown>,
    audience = CLIENT_ID,
) {
    return new JwtService().sign(payload, {
        privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }),
        algorithm: 'RS256',
        keyid: kid,
        issuer: ISSUER,
        audience,
        expiresIn: 60,
    });
}

describe('OidcProvider', () => {
    const signing = keyPair();
    let fetchMock: jest.Mock;
    let provider: OidcProvider;

    beforeEach(() => {
        fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            headers: { get: () => 'public, max-age=3600' },
            json: async () => jwks('k1', signing.publicKey),
        });
        (global as any).fetch = fetchMock;
        provider = new OidcProvider({
            name: 'test',
            clientIds: [CLIENT_ID],
            issuers: [ISSUER],
            jwksUri: 'https://issuer.example/jwks',
        });
    });

    it('maps the claims of a valid token', async () => {
        const credential = sign(signing.privateKey, 'k1', {
            sub: 'abc',
            email: 'Ali@Example.com',
            email_verified: true,
            given_name: 'Ali',
            family_name: 'Veli',
            picture: 'https://img',
        });

        await expect(provider.verify({ credential })).resolves.toEqual({
            provider: 'test',
            subject: 'abc',
            email: 'ali@example.com',
            emailVerified: true,
            name: 'Ali',
            surname: 'Veli',
            picture: 'https://img',
        });
    });

    it('rejects a token issued for another client', async () => {
        const credential = sign(
            signing.privateKey,
            'k1',
            { sub: 'abc' },
            'someone-else',
        );
        await expect(provider.verify({ credential })).rejects.toThrow();
    });

    it('rejects a token signed by a different key with a known key id', async () => {
        const forged = sign(keyPair().privateKey, 'k1', { sub: 'abc' });
        await expect(provider.verify({ credential: forged })).rejects.toThrow();
    });

    it('refetches signing keys for an unknown key id at most once a minute', async () => {
        const valid = sign(signing.privateKey, 'k1', { sub: 'abc' });
        await provider.verify({ credential: valid });
        const unknown = sign(signing.privateKey, 'k2', { sub: 'abc' });

        await expect(provider.verify({ credential: unknown })).rejects.toThrow();
        await expect(provider.verify({ credential: unknown })).rejects.toThrow();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('is not configured without a client id', () => {
        const unconfigured = new OidcProvider({
            name: 'none',
            clientIds: [],
            issuers: [ISSUER],
            jwksUri: 'https://issuer.example/jwks',
        });
        expect(unconfigured.isConfigured()).toBe(false);
    });
});
