import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  GreenhatDocumentAddDTO,
  GreenhatDocumentContentPutDTO,
  GreenhatDocumentDTO,
  GreenhatDocumentListDTO,
  GreenhatDocumentRemovePreviewDTO,
  GreenhatDocumentRemoveResultDTO,
  GreenhatDocumentRenameDTO,
  GreenhatLocalizedContentDTO,
} from '@ubs-platform/greenhat-common';
import {
  DocArticle,
  DocLocalizedContent,
  DocProject,
} from '@ubs-platform/greenhat-entity-mongo';
import {
  EntityOwnershipService,
} from '@ubs-platform/users-microservice-helper';
import { UserAuthBackendDTO } from '@ubs-platform/users-common';
import { lastValueFrom } from 'rxjs';

const GREENHAT_ENTITY_GROUP = 'GREENHAT';
const GREENHAT_ENTITY_NAME_PROJECT = 'PROJECT';
const PROJECT_READ_CAPABILITIES = ['OWNER', 'EDITOR', 'VIEWER'];
const PROJECT_EDIT_CAPABILITIES = ['OWNER', 'EDITOR'];
const LOCALE_KEY_REGEX = /^[a-z]{2}-[a-z]{2}$/;

@Injectable()
export class DocumentService {
  constructor(
    @InjectModel(DocArticle.name)
    private readonly articleModel: Model<DocArticle>,
    @InjectModel(DocProject.name)
    private readonly projectModel: Model<DocProject>,
    private readonly eoService: EntityOwnershipService,
  ) {}

  async addDocument(
    input: GreenhatDocumentAddDTO,
    user: UserAuthBackendDTO,
  ): Promise<GreenhatDocumentDTO> {
    const project = await this.projectModel
      .findOne({ _id: input.projectId, deactivated: false })
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.assertProjectEditCapability(project._id.toString(), user);

    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException('Document name is required');
    }

    const nameLower = name.toLocaleLowerCase('en-US');
    const existingByName = await this.articleModel
      .findOne({
        projectId: project._id,
        nameLower,
        deactivated: false,
      })
      .exec();

    if (existingByName) {
      throw new ConflictException('Document name must be unique in project');
    }

    let parent: DocArticle | null = null;
    if (input.parentId) {
      parent = await this.articleModel
        .findOne({
          _id: input.parentId,
          projectId: project._id,
          deactivated: false,
        })
        .exec();

      if (!parent) {
        throw new NotFoundException('Parent document not found in this project');
      }
    }

    const slug = (input.slug || this.generateTimeSlug()).trim();
    const path = parent ? `${parent.path}/${slug}` : slug;

    const doc = new this.articleModel();
    doc.projectId = project._id;
    doc.parentId = parent ? parent._id : null;
    doc.ancestors = parent ? [...(parent.ancestors || []), parent._id] : [];
    doc.slug = slug;
    doc.path = path;
    doc.name = name;
    doc.nameLower = nameLower;
    doc.createdBy = user.id;
    doc.updatedBy = user.id;
    doc.deactivated = false;

    if (input.initialLocale || input.initialTitle) {
      const locale = input.initialLocale || 'tr-tr';
      this.validateLocale(locale);
      const title = input.initialTitle?.trim() || name;
      doc.titlesByLocale = new Map([[locale, title]]);
    }

    try {
      const saved = await doc.save();
      return this.toDocumentDto(saved);
    } catch (err) {
      throw new ConflictException('Document creation failed due to unique constraint');
    }
  }

  async renameDocument(
    input: GreenhatDocumentRenameDTO,
    user: UserAuthBackendDTO,
  ): Promise<GreenhatDocumentDTO> {
    const doc = await this.articleModel
      .findOne({ _id: input.documentId, deactivated: false })
      .exec();

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    await this.assertProjectEditCapability(doc.projectId.toString(), user);

    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException('Document name is required');
    }

    const nameLower = name.toLocaleLowerCase('en-US');
    const duplicate = await this.articleModel
      .findOne({
        projectId: doc.projectId,
        deactivated: false,
        nameLower,
        _id: { $ne: doc._id },
      })
      .exec();

    if (duplicate) {
      throw new ConflictException('Document name must be unique in project');
    }

    doc.name = name;
    doc.nameLower = nameLower;
    doc.updatedBy = user.id;

    await doc.save();
    return this.toDocumentDto(doc);
  }

  async removeDocumentRecursive(
    documentId: string,
    user: UserAuthBackendDTO,
  ): Promise<GreenhatDocumentRemoveResultDTO> {
    const root = await this.articleModel
      .findOne({ _id: documentId, deactivated: false })
      .exec();

    if (!root) {
      throw new NotFoundException('Document not found');
    }

    await this.assertProjectEditCapability(root.projectId.toString(), user);

    const res = await this.articleModel
      .updateMany(
        {
          projectId: root.projectId,
          deactivated: false,
          $or: [{ _id: root._id }, { ancestors: root._id }],
        },
        {
          $set: {
            deactivated: true,
            updatedBy: user.id,
          },
        },
      )
      .exec();

    return {
      removedCount: res.modifiedCount || 0,
      rootDocumentId: root._id.toString(),
    };
  }

  async previewRecursiveRemove(
    documentId: string,
    user: UserAuthBackendDTO,
  ): Promise<GreenhatDocumentRemovePreviewDTO> {
    const root = await this.articleModel
      .findOne({ _id: documentId, deactivated: false })
      .exec();

    if (!root) {
      throw new NotFoundException('Document not found');
    }

    await this.assertProjectEditCapability(root.projectId.toString(), user);

    const [descendantCount, directChildrenCount] = await Promise.all([
      this.articleModel
        .countDocuments({
          projectId: root.projectId,
          deactivated: false,
          ancestors: root._id,
        })
        .exec(),
      this.articleModel
        .countDocuments({
          projectId: root.projectId,
          deactivated: false,
          parentId: root._id,
        })
        .exec(),
    ]);

    return {
      rootDocumentId: root._id.toString(),
      directChildrenCount,
      descendantCount,
      totalWillBeRemoved: descendantCount + 1,
    };
  }

  async listDocuments(
    input: GreenhatDocumentListDTO,
    user: UserAuthBackendDTO,
  ): Promise<GreenhatDocumentDTO[]> {
    const project = await this.projectModel
      .findOne({ _id: input.projectId, deactivated: false })
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.assertProjectReadCapability(project._id.toString(), user);

    if (input.parentId) {
      const parent = await this.articleModel
        .findOne({
          _id: input.parentId,
          projectId: project._id,
          deactivated: false,
        })
        .exec();

      if (!parent) {
        throw new NotFoundException('Parent document not found in this project');
      }
    }

    const docs = await this.articleModel
      .find({
        projectId: project._id,
        deactivated: false,
        parentId: input.parentId || null,
      })
      .sort({ name: 1, _id: 1 })
      .exec();

    return docs.map((doc) => this.toDocumentDto(doc));
  }

  async putDocumentContent(
    documentId: string,
    input: GreenhatDocumentContentPutDTO,
    user: UserAuthBackendDTO,
  ): Promise<GreenhatDocumentDTO> {
    this.validateLocale(input.locale);

    if (input.type !== 'text') {
      throw new BadRequestException('Only text type is supported for now');
    }

    const doc = await this.articleModel
      .findOne({ _id: documentId, deactivated: false })
      .exec();

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    await this.assertProjectEditCapability(doc.projectId.toString(), user);

    const contents = this.ensureMap<DocLocalizedContent>(doc.contentsByLocale);
    contents.set(input.locale, {
      type: 'text',
      content: input.content,
      updatedBy: user.id,
      updatedAt: new Date(),
    });
    doc.contentsByLocale = contents;

    if (input.title?.trim()) {
      const titles = this.ensureMap<string>(doc.titlesByLocale);
      titles.set(input.locale, input.title.trim());
      doc.titlesByLocale = titles;
    }

    doc.updatedBy = user.id;
    await doc.save();
    return this.toDocumentDto(doc);
  }

  private async assertProjectEditCapability(
    projectId: string,
    user: UserAuthBackendDTO,
  ): Promise<void> {
    if (this.isAdmin(user)) {
      return;
    }

    const capability = await lastValueFrom(
      this.eoService.hasOwnership({
        entityGroup: GREENHAT_ENTITY_GROUP,
        entityName: GREENHAT_ENTITY_NAME_PROJECT,
        entityId: projectId,
        userId: user.id,
        capabilityAtLeastOne: PROJECT_EDIT_CAPABILITIES,
      }),
    );

    if (!capability?.userId) {
      throw new ForbiddenException('You do not have edit permission for this project');
    }
  }

  private async assertProjectReadCapability(
    projectId: string,
    user: UserAuthBackendDTO,
  ): Promise<void> {
    if (this.isAdmin(user)) {
      return;
    }

    const capability = await lastValueFrom(
      this.eoService.hasOwnership({
        entityGroup: GREENHAT_ENTITY_GROUP,
        entityName: GREENHAT_ENTITY_NAME_PROJECT,
        entityId: projectId,
        userId: user.id,
        capabilityAtLeastOne: PROJECT_READ_CAPABILITIES,
      }),
    );

    if (!capability?.userId) {
      throw new ForbiddenException('You do not have read permission for this project');
    }
  }

  private validateLocale(locale: string) {
    if (!LOCALE_KEY_REGEX.test(locale)) {
      throw new BadRequestException('Locale key must look like en-us or tr-tr');
    }
  }

  private toDocumentDto(doc: DocArticle): GreenhatDocumentDTO {
    return {
      _id: doc._id.toString(),
      projectId: doc.projectId.toString(),
      parentId: doc.parentId ? doc.parentId.toString() : null,
      ancestors: (doc.ancestors || []).map((a) => a.toString()),
      slug: doc.slug,
      path: doc.path,
      name: doc.name,
      titlesByLocale: this.mapToRecord<string>(doc.titlesByLocale),
      contentsByLocale: this.mapLocalizedContents(doc.contentsByLocale),
      deactivated: doc.deactivated,
      createdBy: doc.createdBy,
      updatedBy: doc.updatedBy,
    };
  }

  private mapLocalizedContents(
    input:
      | Map<string, DocLocalizedContent>
      | Record<string, DocLocalizedContent>
      | undefined,
  ): Record<string, GreenhatLocalizedContentDTO> {
    const raw = this.mapToRecord<DocLocalizedContent>(input);
    const out: Record<string, GreenhatLocalizedContentDTO> = {};
    for (const [locale, value] of Object.entries(raw)) {
      out[locale] = {
        type: value.type,
        content: value.content,
        updatedBy: value.updatedBy,
        updatedAt: value.updatedAt
          ? new Date(value.updatedAt).toISOString()
          : undefined,
      };
    }
    return out;
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

  private ensureMap<T>(
    input: Map<string, T> | Record<string, T> | undefined,
  ): Map<string, T> {
    if (input instanceof Map) {
      return input;
    }
    if (!input) {
      return new Map<string, T>();
    }
    return new Map<string, T>(Object.entries(input));
  }

  private isAdmin(user: UserAuthBackendDTO): boolean {
    const normalizedRoles = (user.roles || []).map((r) => r.toLowerCase());
    return normalizedRoles.includes('admin');
  }

  private generateTimeSlug(): string {
    return new Date().toISOString().replace(/[-:.TZ]/g, '');
  }
}
