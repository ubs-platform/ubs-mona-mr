export interface ApplicationSocialRestrictionDTO {
  _id: string;

  userId: string;

  restriction: 'COMMENT' | 'POST';

  until?: string;

  endless: boolean;

  note: string;
}

export interface ApplicationSocialRestrictionAddDTO {
  userId: string;

  restriction: 'COMMENT' | 'POST';

  until?: string;

  note: string;
}

export interface ApplicationSocialRestrictionSearchDTO {
  userId: string;

  restriction: 'COMMENT' | 'POST';
}
