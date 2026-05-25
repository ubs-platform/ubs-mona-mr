import { GreenhatDocumentContentType } from './greenhat-document.dto';

export interface GreenhatDocumentContentPutDTO {
  locale: string;
  type: GreenhatDocumentContentType;
  content: string;
  title?: string;
}
