export class PasswordChangeDto {
  currentPassword: string;
  newPassword: string;
  /** Revokes every other session; the response then carries a fresh token for this one. */
  logoutOtherSessions?: boolean;
}
