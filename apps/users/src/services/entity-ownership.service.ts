import { Injectable, Logger } from '@nestjs/common';
import { Model } from 'mongoose';
import {
    EntityOwnership,
    EntityOwnershipDocument,
} from '../domain/entity-ownership.schema';
import { InjectModel } from '@nestjs/mongoose';
import { EntityOwnershipMapper } from '../mapper/entity-ownership.mapper';
import {
    EntityOwnershipDTO,
    EntityOwnershipInsertCapabiltyDTO,
    EntityOwnershipSearch,
    EntityOwnershipUserCheck,
    EntityOwnershipUserSearch,
    UserAuthBackendDTO,
    UserCapabilityDTO,
} from '@ubs-platform/users-common';
import { UserService } from './user.service';
import { exec } from 'child_process';
import { EntityOwnershipGroup } from '../domain/entity-ownership-group.schema';
import { Optional } from '@ubs-platform/crud-base-common/utils';

@Injectable()
export class EntityOwnershipService {
    private readonly logger = new Logger(EntityOwnershipService.name, {
        timestamp: true,
    });

    constructor(
        @InjectModel(EntityOwnership.name)
        private eoModel: Model<EntityOwnership>,
        @InjectModel(EntityOwnershipGroup.name)
        private eogModel: Model<EntityOwnershipGroup>,
        private userService: UserService,
        private mapper: EntityOwnershipMapper,
    ) {}

    public async removeUserCapability(eo: EntityOwnershipUserCheck) {
        const searchKeys: EntityOwnershipSearch = {
            entityGroup: eo.entityGroup,
            entityId: eo.entityId,
            entityName: eo.entityName,
        };

        const updateResult = await this.eoModel.updateOne(searchKeys, {
            $pull: {
                userCapabilities: {
                    userId: eo.userId,
                },
            },
        });

        return updateResult;
    }

    // Ortak kullanılan entity bulma metodu
    private async findEntityBySearchKeys(
        searchKeys: EntityOwnershipSearch,
    ): Promise<EntityOwnership | null> {
        return await this.eoModel.findOne(searchKeys);
    }

    // Ortak kullanılan multiple entity bulma metodu
    private async findEntitiesBySearchKeys(
        searchKeys: EntityOwnershipSearch,
    ): Promise<EntityOwnership[]> {
        return await this.eoModel.find(searchKeys);
    }

    // User capability kontrolü için ortak metod
    private findUserCapabilityInEntity(
        entityOwnership: EntityOwnership,
        userId: string,
        capabilitiesAtLeastOne?: string[],
    ): Optional<UserCapabilityDTO> {
        if (!entityOwnership?.userCapabilities?.length) return null;

        const found = entityOwnership.userCapabilities.find(
            (uc) =>
                uc.userId === userId &&
                (!capabilitiesAtLeastOne?.length ||
                    (uc.capability &&
                        capabilitiesAtLeastOne.includes(uc.capability))),
        );

        return found
            ? { userId: found.userId!, capability: found.capability! }
            : null;
    }

    // EntityOwnershipGroup'dan user capability arama
    private async findUserCapabilityInGroup(
        entityOwnership: EntityOwnership,
        userCheck: EntityOwnershipUserCheck,
    ): Promise<Optional<UserCapabilityDTO>> {
        if (!entityOwnership?.entityOwnershipGroupId) return null;

        const ownerShipGroup = await this.eogModel.findOne({
            _id: entityOwnership.entityOwnershipGroupId,
            userCapabilities: {
                $elemMatch: {
                    userId: userCheck.userId,
                    entityCapabilities: {
                        $elemMatch: {
                            entityGroup: userCheck.entityGroup,
                            entityName: userCheck.entityName,
                            ...(userCheck.capabilityAtLeastOne?.length
                                ? {
                                      capability: {
                                          $in: userCheck.capabilityAtLeastOne,
                                      },
                                  }
                                : {}),
                        },
                    },
                },
            },
        });

        if (!ownerShipGroup?.userCapabilities?.length) return null;

        const userCapability = ownerShipGroup.userCapabilities.find(
            (uc) => uc.userId === userCheck.userId,
        );

        if (!userCapability) return null;

        const entityCapabilityMatch = userCapability.entityCapabilities.find(
            (ec) =>
                userCheck.entityGroup === ec.entityGroup &&
                userCheck.entityName === ec.entityName &&
                (!userCheck.capabilityAtLeastOne?.length ||
                    userCheck.capabilityAtLeastOne.includes(ec.capability)),
        );

        return entityCapabilityMatch
            ? {
                  userId: userCapability.userId!,
                  capability: entityCapabilityMatch.capability!,
              }
            : null;
    }

    // Role override kontrolü
    private async checkRoleOverride(
        roleOverrides: string[],
        userId: string,
        capability?: string,
    ): Promise<Optional<UserCapabilityDTO>> {
        if (!roleOverrides?.length || !userId) return null;

        const user: Optional<UserAuthBackendDTO> =
            await this.userService.findUserAuthBackend(userId);
        if (!user?.roles?.length) return null;

        // Admin her şeyi override eder
        if (user.roles.includes('ADMIN')) {
            return {
                userId: user.id,
                capability: capability?.toString(),
            };
        }

        // Diğer rolleri kontrol et
        const hasOverrideRole = user.roles.some((role) =>
            roleOverrides.includes(role),
        );
        return hasOverrideRole
            ? {
                  userId: user.id,
                  capability: capability?.toString(),
              }
            : null;
    }

    // EntityOwnershipGroup'ları user'a göre bulma
    private async findEntityOwnershipGroupsByUser(
        eo: EntityOwnershipUserSearch,
    ): Promise<EntityOwnershipGroup[]> {
        return await this.eogModel.find({
            'userCapabilities.userId': eo.userId,
            ...(eo.capabilityAtLeastOne
                ? {
                      'userCapabilities.entityCapabilities': {
                          $elemMatch: {
                              capability: { $in: eo.capabilityAtLeastOne },
                              entityGroup: eo.entityGroup,
                              entityName: eo.entityName,
                          },
                      },
                  }
                : {}),
        });
    }

    public async edit(eoDto: EntityOwnershipDTO): Promise<void> {
        this.logger.debug(
            'EO EDIT',
            eoDto.entityGroup,
            eoDto.entityId,
            eoDto.entityName,
        );

        const searchKeys: EntityOwnershipSearch = {
            entityGroup: eoDto.entityGroup,
            entityId: eoDto.entityId,
            entityName: eoDto.entityName,
        };

        const foundEntities = await this.findEntitiesBySearchKeys(searchKeys);
        let entity;

        if (foundEntities.length > 0) {
            entity = foundEntities[0];
            this.mapper.toEntityEditWithMembers(entity, eoDto);
            await entity.save();
        } else {
            throw new Error('EntityOwnership not found for edit.');
        }
    }

    async insert(eoDto: EntityOwnershipDTO): Promise<void> {
        this.logger.debug(
            'EO INSERT',
            eoDto.entityGroup,
            eoDto.entityId,
            eoDto.entityName,
        );

        const searchKeys: EntityOwnershipSearch = {
            entityGroup: eoDto.entityGroup,
            entityId: eoDto.entityId,
            entityName: eoDto.entityName,
        };

        const foundEntities = await this.findEntitiesBySearchKeys(searchKeys);
        let entity;

        if (foundEntities.length > 0) {
            entity = foundEntities[0];
            this.mapper.toEntityEdit(entity, eoDto);
        } else {
            entity = this.mapper.toEntity(eoDto);
        }

        await entity.save();
    }

    public async insertUserCapability(
        oe: EntityOwnershipInsertCapabiltyDTO,
    ): Promise<void> {
        const hasRoleAlready = await this.findInsertedUserCapability(oe, false);
        const searchKeys: EntityOwnershipSearch = {
            entityGroup: oe.entityGroup,
            entityId: oe.entityId,
            entityName: oe.entityName,
        };

        if (hasRoleAlready?.userId) {
            await this.updateExistingUserCapability(searchKeys, oe);
        } else {
            await this.addNewUserCapability(searchKeys, oe);
        }
    }

    // Mevcut user capability güncelleme
    private async updateExistingUserCapability(
        searchKeys: EntityOwnershipSearch,
        oe: EntityOwnershipInsertCapabiltyDTO,
    ): Promise<void> {
        const updateResult = await this.eoModel.updateOne(
            { ...searchKeys, 'userCapabilities.userId': oe.userId },
            {
                $set: {
                    'userCapabilities.$[related].capability': oe.capability,
                },
            },
            { arrayFilters: [{ 'related.userId': oe.userId }] },
        );

        if (updateResult.modifiedCount === 0) {
            this.logger.warn('User capability güncellenemedi:', oe);
        }
    }

    // Yeni user capability ekleme
    private async addNewUserCapability(
        searchKeys: EntityOwnershipSearch,
        oe: EntityOwnershipInsertCapabiltyDTO,
    ): Promise<void> {
        const foundEntities = await this.findEntitiesBySearchKeys(searchKeys);
        if (foundEntities.length > 0) {
            const entity = foundEntities[0];
            entity.userCapabilities.push({
                capability: oe.capability,
                userId: oe.userId,
            });
            await (entity as any).save();
        }
    }

    public async hasInsertedUserCapability(
        eouc: EntityOwnershipUserCheck,
        checkRoleOverride: boolean,
    ): Promise<boolean> {
        const found = await this.findInsertedUserCapability(
            eouc,
            checkRoleOverride,
        );
        return !!found;
    }

    public async findInsertedUserCapability(
        entityOwnershipUserCheck: EntityOwnershipUserCheck,
        checkRoleOverride: boolean,
    ): Promise<Optional<UserCapabilityDTO>> {
        this.logger.debug({
            cap: entityOwnershipUserCheck.capabilityAtLeastOne?.join(','),
        });

        const entityOwnership = await this.findEntityBySearchKeys({
            entityGroup: entityOwnershipUserCheck.entityGroup,
            entityId: entityOwnershipUserCheck.entityId,
            entityName: entityOwnershipUserCheck.entityName,
        });

        if (!entityOwnership) return null;

        // EntityOwnership içinsde ara
        let found = this.findUserCapabilityInEntity(
            entityOwnership,
            entityOwnershipUserCheck.userId,
            entityOwnershipUserCheck.capabilityAtLeastOne,
        );

        // EntityOwnership Group içinde ara
        if (!found) {
            found = await this.findUserCapabilityInGroup(
                entityOwnership,
                entityOwnershipUserCheck,
            );
        }

        // Role override kontrolü
        if (!found && checkRoleOverride) {
            const roleOverrides =
                entityOwnership.overriderRoles ||
                (
                    await this.eogModel.findById(
                        entityOwnership.entityOwnershipGroupId,
                    )
                )?.overriderRoles;

            if (roleOverrides?.length) {
                found = await this.checkRoleOverride(
                    roleOverrides,
                    entityOwnershipUserCheck.userId,
                    entityOwnershipUserCheck.capabilityAtLeastOne?.[0],
                );
            }
        }
        this.logger.debug('Found capability:', found);

        return found;
    }

    private async searchByUserRaw(
        eo: EntityOwnershipUserSearch,
    ): Promise<EntityOwnership[]> {
        const eogsByUser = await this.findEntityOwnershipGroupsByUser(eo);
        this.logger.debug('EOGs by user:', eogsByUser.length);

        const eos = await this.eoModel.find({
            entityGroup: eo.entityGroup,
            entityName: eo.entityName,
            entityId: { $ne: null },
            $or: [
                {
                    userCapabilities: {
                        $elemMatch: {
                            userId: eo.userId,
                            ...(eo.capabilityAtLeastOne
                                ? {
                                      capability: {
                                          $in: eo.capabilityAtLeastOne,
                                      },
                                  }
                                : {}),
                        },
                    },
                },
                ...(eogsByUser.length
                    ? [
                          {
                              entityOwnershipGroupId: {
                                  $in: eogsByUser.map((eog) => eog._id),
                              },
                          },
                      ]
                    : []),
            ],
        });
        // debugger;
        return eos;
    }

    async searchByUser(
        eo: EntityOwnershipUserSearch,
    ): Promise<EntityOwnershipDTO[]> {
        const entityOwnerships = await this.searchByUserRaw(eo);
        return entityOwnerships.map((a) => this.mapper.toDto(a));
    }

    async searchByEntityIdsByEogroup(
        eo: EntityOwnershipUserSearch,
    ): Promise<string[]> {
        if (!eo.entityOwnershipGroupId) {
            throw new Error(
                'entityOwnershipGroupId is required for this method.',
            );
        }
        // const eogsByUser = await this.findEntityOwnershipGroupsByUser(eo);
        // this.logger.debug('EOGs by user:', eogsByUser.length);

        const eos = await this.eoModel.find({
            entityGroup: eo.entityGroup,
            entityName: eo.entityName,
            entityId: { $ne: null },
            entityOwnershipGroupId: eo.entityOwnershipGroupId,
        });
        // debugger;
        return eos.map((a) => a.entityId?.toString()!);
    }

    async searchEntityIdsByUser(
        eo: EntityOwnershipUserSearch,
    ): Promise<string[]> {
        const entityOwnerships = await this.searchByUserRaw(eo);
        return entityOwnerships.map((a) => a.entityId!.toString());
    }

    public async search(
        sk: EntityOwnershipSearch,
    ): Promise<EntityOwnershipDTO[]> {
        const entities = await this.findEntitiesBySearchKeys(sk);
        console.info('Found entities:', entities.length);
        return entities.map((a) => this.mapper.toDto(a));
    }

    public async deleteOwnership(sk: EntityOwnershipSearch): Promise<void> {
        await this.eoModel.deleteOne(sk);
    }

    // Deprecated - geriye uyumluluk için
    private async findRaw(
        searchKeys: EntityOwnershipSearch,
    ): Promise<EntityOwnership[]> {
        return this.findEntitiesBySearchKeys(searchKeys);
    }
}
