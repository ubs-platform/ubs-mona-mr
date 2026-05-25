export type GreenhatDeactivatedFilter =
  | 'ALL'
  | 'ONLY_DEACTIVATED'
  | 'NOT_DEACTIVATED';

export interface GreenhatProjectSearchDTO {
  _id?: string;
  slug?: string;
  titleContains?: string;
  admin?: string;
  entityOwnershipGroupId?: string;
  deactivated?: GreenhatDeactivatedFilter;
}
