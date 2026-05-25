export interface GreenhatDocumentRemovePreviewDTO {
  rootDocumentId: string;
  directChildrenCount: number;
  descendantCount: number;
  totalWillBeRemoved: number;
}
