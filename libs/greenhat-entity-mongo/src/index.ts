import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/**
 * Proje/Space: Dokümanların üst konteyneri
 */
@Schema({ collection: 'doc_projects', timestamps: true })
export class DocProject {
  _id!: Types.ObjectId;

  // URL veya kısa tanımlayıcı için (benzersiz)
  @Prop({ type: String, required: true })
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

  @Prop({ type: Boolean, default: false, index: true })
  deactivated: boolean = false;
}

export type DocProjectDoc = HydratedDocument<DocProject>;
export const DocProjectSchema = SchemaFactory.createForClass(DocProject);
DocProjectSchema.index(
  { slug: 1 },
  { unique: true, partialFilterExpression: { deactivated: false } },
);

@Schema({ _id: false })
export class DocLocalizedContent {
  @Prop({ type: String, enum: ['text'], default: 'text' })
  type: 'text' = 'text';

  @Prop({ type: String, default: '' })
  content: string = '';

  @Prop({ type: String })
  updatedBy?: string;

  @Prop({ type: Date })
  updatedAt?: Date;
}
export const DocLocalizedContentSchema =
  SchemaFactory.createForClass(DocLocalizedContent);

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
  slug!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true, index: true })
  nameLower!: string;

  @Prop({ type: Map, of: String, default: {} })
  titlesByLocale: Map<string, string> = new Map();

  @Prop({ type: Map, of: DocLocalizedContentSchema, default: {} })
  contentsByLocale: Map<string, DocLocalizedContent> = new Map();

  // Parent chain: [rootId, ..., directParentId]
  @Prop({ type: [Types.ObjectId], default: [] })
  ancestors: Types.ObjectId[] = [];

  @Prop({ type: String, required: true })
  createdBy!: string;

  @Prop({ type: String })
  updatedBy?: string;

  @Prop({ type: Boolean, default: false, index: true })
  deactivated: boolean = false;
}

export type DocArticleDoc = HydratedDocument<DocArticle>;
export const DocArticleSchema = SchemaFactory.createForClass(DocArticle);

// Path uniqueness is kept on active docs.
DocArticleSchema.index(
  { projectId: 1, path: 1 },
  { unique: true, partialFilterExpression: { deactivated: false } },
);

// Case-insensitive name uniqueness via normalized field.
DocArticleSchema.index(
  { projectId: 1, nameLower: 1 },
  { unique: true, partialFilterExpression: { deactivated: false } },
);

// Parent listing.
DocArticleSchema.index({ projectId: 1, parentId: 1 });

// Subtree queries.
DocArticleSchema.index({ projectId: 1, ancestors: 1 });

// Text search over name and localized titles.
DocArticleSchema.index({ name: 'text', titlesByLocale: 'text' });

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocProject.name, schema: DocProjectSchema },
      { name: DocArticle.name, schema: DocArticleSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class GreenhatEntityMongoModule {}

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