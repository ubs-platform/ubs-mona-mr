export class UBSUsersErrorConsts {
    static readonly EXIST_USERNAME = 'exist-username';
    static readonly EXIST_PRIMARY_MAIL = 'exist-primary-mail';
    static readonly EMPTY_DATA = 'empty-data';
    static readonly AUTHENTICATION_FAIL = 'fail-authentication';
    static readonly USER_NOTFOUND = 'notfound-user';
    static readonly USER_INACTIVE = 'inactive-user';
    static readonly OAUTH_PROVIDER_NOTFOUND = 'notfound-oauth-provider';
    static readonly OAUTH_INVALID_CREDENTIAL = 'invalid-oauth-credential';
    static readonly OAUTH_EMAIL_NOT_VERIFIED = 'unverified-oauth-email';
    static readonly OAUTH_SESSION_NOTFOUND = 'notfound-oauth-session';
    static readonly OAUTH_TOO_MANY_ATTEMPTS = 'too-many-oauth-link-attempts';
    static readonly OAUTH_ALREADY_LINKED = 'already-linked-oauth-account';
    static readonly OAUTH_LINK_NOTFOUND = 'notfound-oauth-link';
    static readonly OAUTH_LAST_LOGIN_METHOD = 'last-login-method';
}
