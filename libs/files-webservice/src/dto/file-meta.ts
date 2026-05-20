export class FileMeta {
  id?: any;
  mimetype: string;
  file: Buffer;
  userId: String;
  needAuthorizationAtView?: boolean;
}
