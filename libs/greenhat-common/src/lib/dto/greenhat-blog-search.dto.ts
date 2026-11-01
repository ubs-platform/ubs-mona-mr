import { GreenhatBlogPostStatus } from './greenhat-blog.dto';

export class GreenhatBlogPostSearchDTO {
  status?: GreenhatBlogPostStatus;
  page?: number | string;
  size?: number | string;
}

export class GreenhatBlogPublicSearchDTO {
  locale?: string;
  page?: number | string;
  size?: number | string;
}
