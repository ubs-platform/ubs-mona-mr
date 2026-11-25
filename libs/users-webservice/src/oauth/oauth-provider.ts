import { OAuthProviderInfoDTO } from '@ubs-platform/users-common';

/** A provider account, normalised so that the login flow stays provider-agnostic. */
export interface OAuthIdentity {
    provider: string;
    /** The provider's stable account identifier. */
    subject: string;
    email?: string;
    emailVerified: boolean;
    name?: string;
    surname?: string;
    picture?: string;
}

export interface OAuthVerifyInput {
    /** Provider-issued credential, such as an OIDC ID token. */
    credential: string;
}

/**
 * Turns a provider credential into a verified identity. Subclasses must reject
 * any credential they cannot fully verify, because callers trust the result.
 */
export abstract class OAuthProvider {
    abstract readonly name: string;

    /** False when the deployment has not supplied this provider's settings. */
    abstract isConfigured(): boolean;

    abstract verify(input: OAuthVerifyInput): Promise<OAuthIdentity>;

    /** What the frontend may know about this provider; never include secrets. */
    publicInfo(): OAuthProviderInfoDTO {
        return { name: this.name };
    }
}
