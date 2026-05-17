export interface FileRequest {
  fileBytesBuff: Buffer;
  mimeType: string;
  size: number;
  name: string;
  category: string;
  volatile: boolean;
  durationMiliseconds: number;
  needAuthorizationAtView: boolean;
}
