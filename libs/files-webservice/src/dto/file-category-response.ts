export interface UploadFileCategoryResponse {
  category?: string;
  name?: string;
  error?: string;
  maxLimitBytes?: number;
  volatile?: boolean;
  durationMiliseconds?: number;
  needAuthorizationAtView?: boolean;
  /**
   * When set, uploads whose declared mime type is not listed are rejected
   * (e.g. `['application/pdf']` for CVs). Unset keeps the old behaviour.
   */
  allowedMimeTypes?: string[];
}

export interface UploadFileCategoryRequest {
  userId: string;
  objectId: string;
  roles: string[];
}
