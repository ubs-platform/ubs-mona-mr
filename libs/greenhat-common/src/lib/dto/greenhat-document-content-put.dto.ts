import { GreenhatDocumentContentType } from './greenhat-document.dto';

export class GreenhatDocumentContentPutDTO {
  locale: string;
  type: GreenhatDocumentContentType;
  content: string;
  title?: string;
}
