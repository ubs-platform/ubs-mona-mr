/**
 * ‼️‼️ do not use in frontend ‼️‼️
 */
export class UserCreateDTO {
  username: string;
  password: string;
  primaryEmail: string;
  name: string;
  surname: string;
  active: boolean;
  // id: string;
  localeCode: string;
  roles: Array<string>;
}
