import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { BaseCrudService, MongoRepositoryWrap } from '@ubs-platform/crud-base';
import {
  GreenhatProjectDTO,
  GreenhatProjectSearchDTO,
} from '@ubs-platform/greenhat-common';
import { DocProject } from '@ubs-platform/greenhat-entity-mongo';
import {
  EntityOwnershipService,
} from '@ubs-platform/users-microservice-helper';
import { UserAuthBackendDTO } from '@ubs-platform/users-common';
import { lastValueFrom } from 'rxjs';

const GREENHAT_ENTITY_GROUP = 'GREENHAT';
const GREENHAT_ENTITY_NAME_PROJECT = 'PROJECT';
const PROJECT_READ_CAPABILITIES = ['OWNER', 'EDITOR', 'VIEWER'];

@Injectable()
export class ProjectService extends BaseCrudService<
  DocProject,
  string,
  GreenhatProjectDTO,
  GreenhatProjectDTO,
  GreenhatProjectSearchDTO
> {
  constructor(
    @InjectModel(DocProject.name)
    private readonly projectModel: Model<DocProject>,
    private readonly eoService: EntityOwnershipService,
  ) {
    super(new MongoRepositoryWrap<DocProject>(projectModel));
  }

  generateNewModel(): DocProject {
    return new this.projectModel();
  }

  getIdFieldNameFromInput(i: GreenhatProjectDTO): string {
    return i._id!;
  }

  getIdFieldNameFromModel(i: DocProject): string {
    return i._id.toString();
  }

  async toOutput(m: DocProject): Promise<GreenhatProjectDTO> {
    return {
      _id: m._id.toString(),
      slug: m.slug,
      title: m.title,
      description: m.description,
      visibility: m.visibility,
      deactivated: m.deactivated,
      createdBy: m.createdBy,
      updatedBy: m.updatedBy,
    };
  }

  moveIntoModel(
    model: DocProject,
    i: GreenhatProjectDTO,
  ): DocProject | Promise<DocProject> {
    model.slug = (i.slug || this.generateTimeSlug()).trim();
    model.title = i.title?.trim();
    model.description = i.description?.trim() || '';
    model.visibility = i.visibility || 'private';
    return model;
  }

  async beforeCreateOrEdit(
    model: DocProject,
    input: GreenhatProjectDTO,
    mode: 'EDIT' | 'CREATE',
    user?: UserAuthBackendDTO,
  ): Promise<void> {
    if (mode === 'CREATE') {
      model.createdBy = user?.id || 'system';
      model.deactivated = false;
      model.slug = (input.slug || this.generateTimeSlug()).trim();
    }
    model.updatedBy = user?.id || model.updatedBy;
  }

  async searchParams(
    s?: Partial<GreenhatProjectSearchDTO>,
    u?: UserAuthBackendDTO,
  ): Promise<FilterQuery<DocProject>> {
    const where: FilterQuery<DocProject> = {};

    if (s?._id) {
      where._id = s._id;
    }

    if (s?.slug) {
      where.slug = s.slug;
    }

    if (s?.titleContains) {
      where.title = { $regex: `.*${s.titleContains}.*`, $options: 'i' };
    }

    if (s?.deactivated === 'ONLY_DEACTIVATED') {
      where.deactivated = true;
    } else if (s?.deactivated === 'ALL') {
      // no-op
    } else {
      where.deactivated = false;
    }

    if (s?.admin !== 'true') {
      if (!u) {
        throw new ForbiddenException('User information is required for search');
      }

      const ownedIds = await lastValueFrom(
        this.eoService.searchOwnershipEntityIdsByUser({
          entityGroup: GREENHAT_ENTITY_GROUP,
          entityName: GREENHAT_ENTITY_NAME_PROJECT,
          userId: u.id,
          ...(s?.entityOwnershipGroupId
            ? { entityOwnershipGroupId: s.entityOwnershipGroupId }
            : {}),
          capabilityAtLeastOne: PROJECT_READ_CAPABILITIES,
        }),
      );

      where._id = {
        $in: ownedIds.length > 0 ? ownedIds : ['000000000000000000000000'],
      };
    }

    return where;
  }

  override async afterCreate(
    m: GreenhatProjectDTO,
    input: GreenhatProjectDTO,
    user?: UserAuthBackendDTO,
  ): Promise<void> {
    if (!user || !m._id) {
      return;
    }

    await this.eoService.insertOwnership({
      entityGroup: GREENHAT_ENTITY_GROUP,
      entityName: GREENHAT_ENTITY_NAME_PROJECT,
      entityId: m._id,
      overriderRoles: [],
      userCapabilities: [{ userId: user.id, capability: 'OWNER' }],
      entityOwnershipGroupId: input.entityOwnershipGroupId as unknown as string,
    });
  }

  override async remove(
    id: string,
    user?: UserAuthBackendDTO,
  ): Promise<GreenhatProjectDTO> {
    const existing = await this.projectModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException('Project not found');
    }
    existing.deactivated = true;
    existing.updatedBy = user?.id || existing.updatedBy;
    await existing.save();
    return this.toOutput(existing);
  }

  private generateTimeSlug(): string {
    return new Date().toISOString().replace(/[-:.TZ]/g, '');
  }
}
