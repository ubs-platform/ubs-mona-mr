export interface FileInformation {
  originalname: string;
  mimetype: string;
  encoding: '7bit' | string;
  buffer: Buffer;
  /** Size in bytes */
  size: number;
}
