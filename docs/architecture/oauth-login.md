# OAuth Login

External sign-in (currently Google) lives in `libs/users-webservice` under `auth/oauth` (served as `/api/users/auth/oauth/...`). The flow always ends in the same local JWT as password login (`AuthService.issueToken`), so nothing downstream knows how a user signed in.

## Flow

The frontend obtains a provider credential (a Google Identity Services ID token) and posts it to `POST auth/oauth/login/:provider` with `{ credential }`. The backend verifies it and returns one of:

| Status | When | Next step |
|---|---|---|
| `LOGGED_IN` | `(provider, subject)` is linked to an active user | Use `token` |
| `REGISTER_REQUIRED` | No link and no user with the verified e-mail | `POST session/:key/register` with username, password, name, surname |
| `LINK_REQUIRED` | No link but a user owns the verified e-mail | `POST session/:key/link` with that user's password |

- Registration skips `UserCandiate` and creates an active user, since the provider verified the e-mail. A password is still required so the account survives losing the provider account.
- Unverified provider e-mails are rejected.
- `GET session/:key` restores a pending step (for example after a page reload).
- Signed-in users manage links with `GET links`, `POST links/:provider` and `DELETE links/:id`.

## Data

- `UserOAuthLink`: `userId`, `provider`, `subject`, `email`, timestamps. Unique on `(provider, subject)`; a user may hold several links. Look users up by `subject`, never by e-mail, once linked.
- `OAuthLoginSession`: the verified identity awaiting registration or linking. Expires after 15 minutes (TTL index), is single-use, and allows five password attempts. Clients only hold its key; e-mail and subject are read from the session, never from the request.

## Providers

`OAuthProvider` turns a credential into an `OAuthIdentity`. `OidcProvider` verifies OIDC ID tokens against the provider's JWKS (cached by `Cache-Control`, unknown key ids refetched at most once a minute). `GoogleOAuthProvider` only supplies configuration. Register new providers in `OAuthProviderRegistry`; providers without configuration are hidden from `GET providers`. Non-OIDC providers (for example GitHub) need their own `verify` implementation, usually an authorization-code exchange.

`OidcProvider` uses its own unconfigured `JwtService`: the module's instance prefers the local signing secret over a supplied public key.

## Configuration

| Variable | Meaning |
|---|---|
| `U_USERS_OAUTH_GOOGLE_CLIENT_ID` | Google OAuth client IDs, comma-separated; the first must be the web client, because `GET providers` returns it to browsers. No client secret is needed. |
