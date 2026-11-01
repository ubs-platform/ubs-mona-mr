import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, isValidObjectId, Model } from 'mongoose';
import {
  GreenhatBlogLocalizedContentDTO,
  GreenhatBlogPageDTO,
  GreenhatBlogPostDTO,
  GreenhatBlogPostListItemDTO,
  GreenhatBlogPostPublishDTO,
  GreenhatBlogPostSaveDTO,
  GreenhatBlogPostSearchDTO,
  GreenhatBlogPublicPostDTO,
  GreenhatBlogPublicSearchDTO,
  GreenhatBlogPublicSummaryDTO,
} from '@ubs-platform/greenhat-common';
import {
  BlogLocalizedContent,
  DocBlogPost,
} from '@ubs-platform/greenhat-entity-mongo';
import { UserAuthBackendDTO } from '@ubs-platform/users-common';

const LOCALE_KEY_REGEX = /^[a-z]{2}-[a-z]{2}$/;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 120;
const MAX_TITLE_LENGTH = 300;
const MAX_MARKDOWN_LENGTH = 500_000;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const EXCERPT_LENGTH = 200;
const FALLBACK_LOCALE = 'tr-tr';

@Injectable()
export class BlogService {
  constructor(
    @InjectModel(DocBlogPost.name) private postModel: Model<DocBlogPost>,
  ) {}

  async listAdmin(
    search: GreenhatBlogPostSearchDTO,
  ): Promise<GreenhatBlogPageDTO<GreenhatBlogPostListItemDTO>> {
    const filter: FilterQuery<DocBlogPost> = { deactivated: false };
    if (search?.status === 'draft' || search?.status === 'published') {
      filter.status = search.status;
    }
    const { page, size } = this.normalizePaging(search?.page, search?.size);

    const [docs, total] = await Promise.all([
      this.postModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(page * size)
        .limit(size)
        .exec(),
      this.postModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((d) => this.toListItemDto(d)),
      total,
      page,
      size,
    };
  }

  async getAdmin(id: string): Promise<GreenhatBlogPostDTO> {
    return this.toDto(await this.findActiveById(id));
  }

  async create(
    input: GreenhatBlogPostSaveDTO,
    user: UserAuthBackendDTO,
  ): Promise<GreenhatBlogPostDTO> {
    const doc = new this.postModel();
    doc.createdBy = user.id;
    doc.updatedBy = user.id;
    doc.status = 'draft';
    doc.deactivated = false;
    this.applySave(doc, input, user);
    await this.ensureSlugAvailable(doc.slug);
    return this.toDto(await this.saveHandlingConflict(doc));
  }

  async update(
    id: string,
    input: GreenhatBlogPostSaveDTO,
    user: UserAuthBackendDTO,
  ): Promise<GreenhatBlogPostDTO> {
    const doc = await this.findActiveById(id);
    const oldSlug = doc.slug;
    this.applySave(doc, input, user);
    if (doc.slug !== oldSlug) {
      await this.ensureSlugAvailable(doc.slug, doc._id.toString());
    }
    doc.updatedBy = user.id;
    return this.toDto(await this.saveHandlingConflict(doc));
  }

  async setPublished(
    id: string,
    input: GreenhatBlogPostPublishDTO,
    user: UserAuthBackendDTO,
  ): Promise<GreenhatBlogPostDTO> {
    const doc = await this.findActiveById(id);
    if (input?.published) {
      const defaultContent = this.mapToRecord(doc.contentsByLocale)[
        doc.defaultLocale
      ];
      if (!defaultContent?.markdown?.trim()) {
        throw new BadRequestException(
          'Default locale content is required to publish',
        );
      }
      if (doc.status !== 'published' && !doc.publishedAt) {
        doc.publishedAt = new Date();
      }
      doc.status = 'published';
    } else {
      doc.status = 'draft';
    }
    doc.updatedBy = user.id;
    return this.toDto(await doc.save());
  }

  async remove(id: string, user: UserAuthBackendDTO): Promise<void> {
    const doc = await this.findActiveById(id);
    doc.deactivated = true;
    doc.updatedBy = user.id;
    await doc.save();
  }

  async listPublic(
    search: GreenhatBlogPublicSearchDTO,
  ): Promise<GreenhatBlogPageDTO<GreenhatBlogPublicSummaryDTO>> {
    if (search?.locale) {
      this.validateLocale(search.locale);
    }
    const filter: FilterQuery<DocBlogPost> = {
      status: 'published',
      deactivated: false,
    };
    const { page, size } = this.normalizePaging(search?.page, search?.size);

    const [docs, total] = await Promise.all([
      this.postModel
        .find(filter)
        .sort({ publishedAt: -1 })
        .skip(page * size)
        .limit(size)
        .exec(),
      this.postModel.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((d) => this.toPublicSummary(d, search?.locale)),
      total,
      page,
      size,
    };
  }

  async getPublicBySlug(
    slug: string,
    locale?: string,
  ): Promise<GreenhatBlogPublicPostDTO> {
    if (locale) {
      this.validateLocale(locale);
    }
    const doc = await this.postModel
      .findOne({ slug, status: 'published', deactivated: false })
      .exec();
    if (!doc) {
      throw new NotFoundException('Blog post not found');
    }
    const resolved = this.resolveLocale(doc, locale);
    const content = this.mapToRecord(doc.contentsByLocale)[resolved];
    return {
      slug: doc.slug,
      title: this.mapToRecord(doc.titlesByLocale)[resolved] || doc.slug,
      markdown: content?.markdown || '',
      locale: resolved,
      publishedAt: doc.publishedAt
        ? new Date(doc.publishedAt).toISOString()
        : undefined,
      availableLocales: this.availableLocales(doc),
    };
  }

  private applySave(
    doc: DocBlogPost,
    input: GreenhatBlogPostSaveDTO,
    user: UserAuthBackendDTO,
  ) {
    const titles = new Map<string, string>();
    for (const [locale, title] of Object.entries(input?.titlesByLocale || {})) {
      this.validateLocale(locale);
      const trimmed = (title || '').trim();
      if (trimmed.length > MAX_TITLE_LENGTH) {
        throw new BadRequestException(
          `Title must be at most ${MAX_TITLE_LENGTH} characters`,
        );
      }
      if (trimmed) {
        titles.set(locale, trimmed);
      }
    }

    const previous = this.mapToRecord(doc.contentsByLocale);
    const contents = new Map<string, BlogLocalizedContent>();
    for (const [locale, value] of Object.entries(
      input?.contentsByLocale || {},
    )) {
      this.validateLocale(locale);
      const markdown = value?.markdown ?? '';
      if (typeof markdown !== 'string') {
        throw new BadRequestException('Markdown must be a string');
      }
      if (markdown.length > MAX_MARKDOWN_LENGTH) {
        throw new BadRequestException(
          `Markdown must be at most ${MAX_MARKDOWN_LENGTH} characters`,
        );
      }
      const old = previous[locale];
      contents.set(
        locale,
        old && old.markdown === markdown
          ? old
          : { markdown, updatedBy: user.id, updatedAt: new Date() },
      );
    }

    const locales = new Set([...titles.keys(), ...contents.keys()]);
    if (!locales.size) {
      throw new BadRequestException('At least one locale is required');
    }

    const defaultLocale =
      input?.defaultLocale ||
      (locales.has(doc.defaultLocale) ? doc.defaultLocale : undefined) ||
      (locales.has(FALLBACK_LOCALE) ? FALLBACK_LOCALE : [...locales][0]);
    this.validateLocale(defaultLocale);
    if (!locales.has(defaultLocale)) {
      throw new BadRequestException(
        'Default locale must have a title or content',
      );
    }

    doc.titlesByLocale = titles;
    doc.contentsByLocale = contents;
    doc.defaultLocale = defaultLocale;
    doc.slug = this.normalizeSlug(input?.slug) || doc.slug || this.generateTimeSlug();

    if (doc.status === 'published') {
      const defaultMarkdown = contents.get(defaultLocale)?.markdown;
      if (!defaultMarkdown?.trim()) {
        throw new BadRequestException(
          'Published post requires content in the default locale',
        );
      }
    }
  }

  private normalizeSlug(slug?: string): string | undefined {
    const normalized = slug?.trim().toLowerCase();
    if (!normalized) {
      return undefined;
    }
    if (normalized.length > MAX_SLUG_LENGTH || !SLUG_REGEX.test(normalized)) {
      throw new BadRequestException(
        'Slug may contain only lowercase letters, numbers and single hyphens',
      );
    }
    return normalized;
  }

  private async ensureSlugAvailable(slug: string, excludeId?: string) {
    const filter: FilterQuery<DocBlogPost> = { slug, deactivated: false };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }
    const existing = await this.postModel.findOne(filter).exec();
    if (existing) {
      throw new ConflictException('Blog slug must be unique');
    }
  }

  private async saveHandlingConflict(doc: any): Promise<DocBlogPost> {
    try {
      return await doc.save();
    } catch (e: any) {
      if (e?.code === 11000) {
        throw new ConflictException('Blog slug must be unique');
      }
      throw e;
    }
  }

  private async findActiveById(id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Blog post not found');
    }
    const doc = await this.postModel
      .findOne({ _id: id, deactivated: false })
      .exec();
    if (!doc) {
      throw new NotFoundException('Blog post not found');
    }
    return doc;
  }

  private normalizePaging(page?: number | string, size?: number | string) {
    const p = Math.floor(Number(page));
    const s = Math.floor(Number(size));
    return {
      page: Number.isFinite(p) && p > 0 ? p : 0,
      size:
        Number.isFinite(s) && s > 0
          ? Math.min(s, MAX_PAGE_SIZE)
          : DEFAULT_PAGE_SIZE,
    };
  }

  private validateLocale(locale: string) {
    if (!LOCALE_KEY_REGEX.test(locale)) {
      throw new BadRequestException('Locale key must look like en-us or tr-tr');
    }
  }

  private resolveLocale(doc: DocBlogPost, requested?: string): string {
    const contents = this.mapToRecord(doc.contentsByLocale);
    const hasContent = (l?: string) => !!l && !!contents[l]?.markdown;
    if (hasContent(requested)) {
      return requested!;
    }
    if (hasContent(doc.defaultLocale)) {
      return doc.defaultLocale;
    }
    return Object.keys(contents).find(hasContent) || doc.defaultLocale;
  }

  private availableLocales(doc: DocBlogPost): string[] {
    const contents = this.mapToRecord(doc.contentsByLocale);
    return Object.keys(contents).filter((l) => !!contents[l]?.markdown);
  }

  private toPublicSummary(
    doc: DocBlogPost,
    requested?: string,
  ): GreenhatBlogPublicSummaryDTO {
    const locale = this.resolveLocale(doc, requested);
    const markdown =
      this.mapToRecord(doc.contentsByLocale)[locale]?.markdown || '';
    return {
      slug: doc.slug,
      title: this.mapToRecord(doc.titlesByLocale)[locale] || doc.slug,
      locale,
      excerpt: this.makeExcerpt(markdown),
      publishedAt: doc.publishedAt
        ? new Date(doc.publishedAt).toISOString()
        : undefined,
      availableLocales: this.availableLocales(doc),
    };
  }

  private makeExcerpt(markdown: string): string {
    const plain = markdown
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[#>*_`~\-|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return plain.length > EXCERPT_LENGTH
      ? plain.slice(0, EXCERPT_LENGTH).trimEnd() + '…'
      : plain;
  }

  private toListItemDto(doc: DocBlogPost): GreenhatBlogPostListItemDTO {
    const titles = this.mapToRecord(doc.titlesByLocale);
    const contents = this.mapToRecord(doc.contentsByLocale);
    return {
      _id: doc._id.toString(),
      slug: doc.slug,
      status: doc.status,
      publishedAt: this.iso(doc.publishedAt),
      defaultLocale: doc.defaultLocale,
      titlesByLocale: titles,
      locales: [...new Set([...Object.keys(titles), ...Object.keys(contents)])],
      updatedAt: this.iso((doc as any).updatedAt),
    };
  }

  private toDto(doc: DocBlogPost): GreenhatBlogPostDTO {
    const contents: Record<string, GreenhatBlogLocalizedContentDTO> = {};
    for (const [locale, value] of Object.entries(
      this.mapToRecord(doc.contentsByLocale),
    )) {
      contents[locale] = {
        markdown: value.markdown,
        updatedBy: value.updatedBy,
        updatedAt: this.iso(value.updatedAt),
      };
    }
    return {
      _id: doc._id.toString(),
      slug: doc.slug,
      status: doc.status,
      publishedAt: this.iso(doc.publishedAt),
      defaultLocale: doc.defaultLocale,
      titlesByLocale: this.mapToRecord(doc.titlesByLocale),
      contentsByLocale: contents,
      deactivated: doc.deactivated,
      createdBy: doc.createdBy,
      updatedBy: doc.updatedBy,
      createdAt: this.iso((doc as any).createdAt),
      updatedAt: this.iso((doc as any).updatedAt),
    };
  }

  private iso(d?: Date | string): string | undefined {
    return d ? new Date(d).toISOString() : undefined;
  }

  private mapToRecord<T>(
    input: Map<string, T> | Record<string, T> | undefined,
  ): Record<string, T> {
    if (!input) {
      return {};
    }
    if (input instanceof Map) {
      return Object.fromEntries(input.entries());
    }
    return { ...input };
  }

  private generateTimeSlug(): string {
    return new Date().toISOString().replace(/[-:.TZ]/g, '');
  }
}
