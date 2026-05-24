import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/**
 * Proje/Space: Dokümanların üst konteyneri
 */
@Schema({ collection: 'doc_projects', timestamps: true })
export class DocProject {
  _id!: Types.ObjectId;

  // URL veya kısa tanımlayıcı için (benzersiz)
  @Prop({ type: String, required: true, unique: true, index: true })
  slug!: string;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, default: '' })
  description: string = '';

  // Basit görünürlük: sonra genişletilebilir
  @Prop({ type: String, enum: ['private', 'public'], default: 'private' })
  visibility: 'private' | 'public' = 'private';

  @Prop({ type: String, required: true })
  createdBy!: string;

  @Prop({ type: String })
  updatedBy?: string;
}

export type DocProjectDoc = HydratedDocument<DocProject>;
export const DocProjectSchema = SchemaFactory.createForClass(DocProject);

/**
 * Article: Ağaç yapısındaki asıl düğüm
 * parentId = null ise root node
 * ancestors = hızlı subtree sorguları için parent zinciri
 */
@Schema({ collection: 'doc_articles', timestamps: true })
export class DocArticle {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: DocProject.name, required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'DocArticle', default: null, index: true })
  parentId!: Types.ObjectId | null;

  // path veya slug bazlı erişim için benzersiz alan
  @Prop({ type: String, required: true })
  path!: string;

  @Prop({ type: String, required: true })
  title!: string;

  // İçerik tipi basit tutuldu (MVP)
  @Prop({ type: String, enum: ['markdown', 'html'], default: 'markdown' })
  contentType!: 'markdown' | 'html';

  // Ana metin içeriği
  @Prop({ type: String, default: '' })
  content: string = '';

  // Yayın durumu
  @Prop({ type: String, enum: ['draft', 'published'], default: 'draft', index: true })
  status: 'draft' | 'published' = 'draft';

  @Prop({ type: Date, default: null })
  publishedAt: Date | null = null;

  // Kardeş sıralaması (aynı parent altındaki order)
  @Prop({ type: Number, default: 0 })
  order: number = 0;

  // Parent zinciri: [rootId, ..., directParentId]
  @Prop({ type: [Types.ObjectId], default: [] })
  ancestors: Types.ObjectId[] = [];

  // Hızlı filtreleme için opsiyonel etiketler
  @Prop({ type: [String], default: [] })
  tags: string[] = [];

  // Mevcut file servisteki dosya kimliği (opsiyonel)
  @Prop({ type: String, default: null })
  coverFileId: string | null = null;

  @Prop({ type: [String], default: [] })
  attachmentFileIds: string[] = [];

  @Prop({ type: String, required: true })
  createdBy!: string;

  @Prop({ type: String })
  updatedBy?: string;
}

export type DocArticleDoc = HydratedDocument<DocArticle>;
export const DocArticleSchema = SchemaFactory.createForClass(DocArticle);

// Aynı proje içinde path benzersiz olsun
DocArticleSchema.index({ projectId: 1, path: 1 }, { unique: true });

// Parent altında listeleme + sıralama
DocArticleSchema.index({ projectId: 1, parentId: 1, order: 1 });

// Subtree sorguları için
DocArticleSchema.index({ projectId: 1, ancestors: 1 });

// Basit metin araması
DocArticleSchema.index({ title: 'text', content: 'text', tags: 'text' });

/**
 * Opsiyonel, hafif revision tablosu (istersen sonradan açarsın)
 */
// @Schema({ collection: 'doc_article_revisions', timestamps: true })
// export class DocArticleRevision {
//   _id!: Types.ObjectId;

//   @Prop({ type: Types.ObjectId, ref: 'DocArticle', required: true, index: true })
//   articleId!: Types.ObjectId;

//   @Prop({ type: Number, required: true })
//   version!: number;

//   @Prop({ type: String, required: true })
//   contentSnapshot!: string;

//   @Prop({ type: String, default: '' })
//   changeNote: string = '';

//   @Prop({ type: String, required: true })
//   editedBy!: string;
// }

// export type DocArticleRevisionDoc = HydratedDocument<DocArticleRevision>;
// export const DocArticleRevisionSchema = SchemaFactory.createForClass(DocArticleRevision);

// Aynı article + version tekil olsun
// DocArticleRevisionSchema.index({ articleId: 1, version: 1 }, { unique: true });