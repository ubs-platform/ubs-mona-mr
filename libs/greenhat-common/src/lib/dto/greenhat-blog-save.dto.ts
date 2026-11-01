export class GreenhatBlogPostSaveDTO {
  // Boş bırakılırsa zaman damgasından üretilir
  slug?: string;
  defaultLocale?: string;
  titlesByLocale: Record<string, string>;
  contentsByLocale: Record<string, { markdown: string }>;
}

export class GreenhatBlogPostPublishDTO {
  published: boolean;
}
