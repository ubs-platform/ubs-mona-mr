import { Injectable } from '@nestjs/common';
import { GoogleOAuthProvider } from './google-oauth-provider';
import { OAuthProvider } from './oauth-provider';

/** Holds the providers this deployment has configured. Add new providers here. */
@Injectable()
export class OAuthProviderRegistry {
    private readonly providers: OAuthProvider[];

    constructor() {
        this.providers = [new GoogleOAuthProvider()].filter((p) =>
            p.isConfigured(),
        );
    }

    list(): OAuthProvider[] {
        return this.providers;
    }

    find(name: string): OAuthProvider | undefined {
        return this.providers.find((p) => p.name === name);
    }
}
