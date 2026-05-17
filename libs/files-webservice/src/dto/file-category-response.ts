export interface UploadFileCategoryResponse {
  category?: string;
  name?: string;
  error?: string;
  maxLimitBytes?: number;
  volatile?: boolean;
  durationMiliseconds?: number;
  needAuthorizationAtView?: boolean;
}

export interface UploadFileCategoryRequest {
  userId: string;
  objectId: string;
  roles: string[];
}
