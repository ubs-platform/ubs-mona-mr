export interface GreenhatProjectDTO {
  _id?: string;
  slug: string;
  title: string;
  description?: string;
  visibility?: 'private' | 'public';
  entityOwnershipGroupId?: string;
  deactivated?: boolean;
  createdBy?: string;
  updatedBy?: string;
}
