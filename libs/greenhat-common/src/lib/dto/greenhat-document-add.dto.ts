export interface GreenhatDocumentAddDTO {
  projectId: string;
  parentId?: string | null;
  name: string;
  slug?: string;
  initialLocale?: string;
  initialTitle?: string;
}
