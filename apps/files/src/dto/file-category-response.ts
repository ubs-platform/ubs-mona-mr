export interface UploadFileCategoryResponse {
  category?: string;
  name?: string;
  error?: string;
  maxLimitBytes?: number;
  volatile?: boolean;
  durationMiliseconds?: number;
}

export interface UploadFileCategoryRequest {
  userId: string;
  objectId: string;
  roles: string[];
}
