export type GreenhatBlogPostStatus = 'draft' | 'published';

export interface GreenhatBlogLocalizedContentDTO {
  markdown: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface GreenhatBlogPostDTO {
  _id?: string;
  slug: string;
  status: GreenhatBlogPostStatus;
  publishedAt?: string;
  defaultLocale: string;
  titlesByLocale: Record<string, string>;
  contentsByLocale: Record<string, GreenhatBlogLocalizedContentDTO>;
  deactivated?: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GreenhatBlogPostListItemDTO {
  _id: string;
  slug: string;
  status: GreenhatBlogPostStatus;
  publishedAt?: string;
  defaultLocale: string;
  titlesByLocale: Record<string, string>;
  locales: string[];
  updatedAt?: string;
}

export interface GreenhatBlogPageDTO<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
