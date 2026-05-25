export type GreenhatDocumentContentType = 'text';

export interface GreenhatLocalizedContentDTO {
  type: GreenhatDocumentContentType;
  content: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface GreenhatDocumentDTO {
  _id?: string;
  projectId: string;
  parentId?: string | null;
  ancestors: string[];
  slug: string;
  path: string;
  name: string;
  titlesByLocale: Record<string, string>;
  contentsByLocale: Record<string, GreenhatLocalizedContentDTO>;
  deactivated?: boolean;
  createdBy?: string;
  updatedBy?: string;
}
