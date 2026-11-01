import { BadRequestException, ConflictException } from '@nestjs/common';
import { BlogService } from './blog.service';

const admin = { id: 'admin-1', roles: ['ADMIN'] } as any;

function createModel() {
  const store: any[] = [];
  let seq = 0;

  const matches = (doc: any, filter: any) =>
    Object.entries(filter).every(([k, v]: [string, any]) => {
      if (v && typeof v === 'object' && '$ne' in v) {
        return String(doc[k]) !== String(v.$ne);
      }
      return String(doc[k]) === String(v);
    });

  class FakeModel {
    _id = '';
    slug!: string;
    status = 'draft';
    defaultLocale = 'tr-tr';
    deactivated = false;
    titlesByLocale = new Map();
    contentsByLocale = new Map();
    createdBy!: string;
    updatedBy?: string;
    publishedAt?: Date;

    async save() {
      if (!this._id) {
        this._id = 'aaaaaaaaaaaaaaaaaaaaaaa' + ++seq;
        store.push(this);
      }
      return this;
    }

    static findOne(filter: any) {
      return { exec: async () => store.find((d) => matches(d, filter)) ?? null };
    }

    static find(filter: any) {
      const rows = store.filter((d) => matches(d, filter));
      const chain: any = {
        sort: () => chain,
        skip: () => chain,
        limit: () => chain,
        exec: async () => rows,
      };
      return chain;
    }

    static countDocuments(filter: any) {
      return {
        exec: async () => store.filter((d) => matches(d, filter)).length,
      };
    }
  }

  return { model: FakeModel as any, store };
}

describe('BlogService', () => {
  let service: BlogService;
  let store: any[];

  beforeEach(() => {
    const m = createModel();
    store = m.store;
    service = new BlogService(m.model);
  });

  it('creates a draft with a timestamp slug when slug is missing', async () => {
    const out = await service.create(
      {
        titlesByLocale: { 'tr-tr': ' Merhaba ' },
        contentsByLocale: { 'tr-tr': { markdown: '# Selam' } },
      },
      admin,
    );

    expect(out.status).toBe('draft');
    expect(out.slug).toMatch(/^\d{17}$/);
    expect(out.titlesByLocale['tr-tr']).toBe('Merhaba');
    expect(out.contentsByLocale['tr-tr'].markdown).toBe('# Selam');
    expect(out.defaultLocale).toBe('tr-tr');
  });

  it('rejects invalid slug and invalid locale keys', async () => {
    await expect(
      service.create(
        {
          slug: 'Bad Slug',
          titlesByLocale: { 'tr-tr': 'x' },
          contentsByLocale: {},
        },
        admin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.create(
        { titlesByLocale: { turkish: 'x' }, contentsByLocale: {} },
        admin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate slug among active posts', async () => {
    const input = {
      slug: 'ilk-yazi',
      titlesByLocale: { 'tr-tr': 'a' },
      contentsByLocale: { 'tr-tr': { markdown: 'a' } },
    };
    await service.create(input, admin);
    await expect(service.create(input, admin)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('publishes only with default locale content and keeps first publishedAt', async () => {
    const created = await service.create(
      { slug: 'x', titlesByLocale: { 'tr-tr': 'a' }, contentsByLocale: {} },
      admin,
    );
    await expect(
      service.setPublished(created._id!, { published: true }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);

    await service.update(
      created._id!,
      {
        titlesByLocale: { 'tr-tr': 'a' },
        contentsByLocale: { 'tr-tr': { markdown: 'icerik' } },
      },
      admin,
    );
    const published = await service.setPublished(
      created._id!,
      { published: true },
      admin,
    );
    const firstPublishedAt = published.publishedAt;
    expect(published.status).toBe('published');
    expect(firstPublishedAt).toBeDefined();

    await service.setPublished(created._id!, { published: false }, admin);
    const again = await service.setPublished(
      created._id!,
      { published: true },
      admin,
    );
    expect(again.publishedAt).toBe(firstPublishedAt);
  });

  it('serves public posts with locale fallback and hides drafts and removed posts', async () => {
    const pub = await service.create(
      {
        slug: 'public-post',
        titlesByLocale: { 'tr-tr': 'Merhaba', 'en-us': 'Hello' },
        contentsByLocale: {
          'tr-tr': { markdown: '# Merhaba dünya' },
          'en-us': { markdown: 'Hello **world**' },
        },
      },
      admin,
    );
    await service.setPublished(pub._id!, { published: true }, admin);
    await service.create(
      {
        slug: 'draft-post',
        titlesByLocale: { 'tr-tr': 'Taslak' },
        contentsByLocale: { 'tr-tr': { markdown: 'x' } },
      },
      admin,
    );

    const list = await service.listPublic({ locale: 'en-us' });
    expect(list.total).toBe(1);
    expect(list.items[0].title).toBe('Hello');
    expect(list.items[0].excerpt).toBe('Hello world');

    const de = await service.getPublicBySlug('public-post', 'de-de');
    expect(de.locale).toBe('tr-tr');
    expect(de.title).toBe('Merhaba');

    await expect(service.getPublicBySlug('draft-post')).rejects.toThrow(
      'Blog post not found',
    );

    await service.remove(pub._id!, admin);
    await expect(service.getPublicBySlug('public-post')).rejects.toThrow(
      'Blog post not found',
    );
    expect((await service.listAdmin({})).total).toBe(1);
    expect(store).toHaveLength(2);
  });
});
