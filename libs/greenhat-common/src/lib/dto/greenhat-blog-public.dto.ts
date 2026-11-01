export interface GreenhatBlogPublicSummaryDTO {
  slug: string;
  title: string;
  locale: string;
  excerpt: string;
  publishedAt?: string;
  availableLocales: string[];
}

export interface GreenhatBlogPublicPostDTO {
  slug: string;
  title: string;
  markdown: string;
  locale: string;
  publishedAt?: string;
  availableLocales: string[];
}
