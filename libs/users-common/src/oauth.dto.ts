export type OAuthLoginStatus =
  | 'LOGGED_IN'
  | 'REGISTER_REQUIRED'
  | 'LINK_REQUIRED';

export class OAuthProviderInfoDTO {
  name: string;
  /** Public client ID the frontend needs to start the provider's sign-in. */
  clientId?: string;
}

/** Provider-issued credential, such as a Google ID token. */
export class OAuthCredentialDTO {
  credential: string;
}

/** Values the frontend can pre-fill; the backend never trusts them back. */
export class OAuthPrefillDTO {
  email: string;
  name?: string;
  surname?: string;
  picture?: string;
  usernameSuggestion?: string;
}

export class OAuthLoginResultDTO {
  status: OAuthLoginStatus;
  provider: string;
  /** Present when `status` is `LOGGED_IN`. */
  token?: string;
  /** Present when `status` is `REGISTER_REQUIRED` or `LINK_REQUIRED`. */
  sessionKey?: string;
  prefill?: OAuthPrefillDTO;
}

export class OAuthCompleteRegistrationDTO {
  username: string;
  password: string;
  name: string;
  surname: string;
  localeCode?: string;
}

export class OAuthLinkWithPasswordDTO {
  password: string;
}

export class OAuthLinkDTO {
  id: string;
  provider: string;
  email?: string;
  linkedAt: Date;
  lastLoginAt?: Date;
}
