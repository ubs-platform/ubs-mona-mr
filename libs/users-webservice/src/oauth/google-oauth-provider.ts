import { envList, OidcProvider } from './oidc-provider';

/**
 * Google Identity Services ID tokens. Configure with
 * `U_USERS_OAUTH_GOOGLE_CLIENT_ID` (comma-separate several client IDs).
 */
export class GoogleOAuthProvider extends OidcProvider {
    constructor(env: NodeJS.ProcessEnv = process.env) {
        super({
            name: 'google',
            clientIds: envList(env['U_USERS_OAUTH_GOOGLE_CLIENT_ID']),
            issuers: ['https://accounts.google.com', 'accounts.google.com'],
            jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
        });
    }
}
