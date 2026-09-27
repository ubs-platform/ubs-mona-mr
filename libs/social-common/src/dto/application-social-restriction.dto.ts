export interface ApplicationSocialRestrictionDTO {
  _id: string;

  userId: string;

  restriction: 'COMMENT' | 'POST';

  until?: string;

  endless: boolean;

  note: string;
}

export class ApplicationSocialRestrictionAddDTO {
  userId: string;

  restriction: 'COMMENT' | 'POST';

  until?: string;

  note: string;
}

export class ApplicationSocialRestrictionSearchDTO {
  userId: string;

  restriction: 'COMMENT' | 'POST';
}
