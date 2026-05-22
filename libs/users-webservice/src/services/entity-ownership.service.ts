import { Injectable, Logger } from '@nestjs/common';
import {
    EntityOwnership,
} from '@ubs-platform/users-entity-mongo';
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
import { EntityOwnershipGroup } from '@ubs-platform/users-entity-mongo';
import { Optional } from '@ubs-platform/crud-base-common/utils';
import { InjectBaseRepository, IBaseRepository, QueryOperators } from '@ubs-platform/entity-base';

@Injectable()
export class EntityOwnershipService {
    private readonly logger = new Logger(EntityOwnershipService.name, {
        timestamp: true,
    });

    constructor(
        @InjectBaseRepository(EntityOwnership)
        private eoRepository: IBaseRepository<EntityOwnership>,
        @InjectBaseRepository(EntityOwnershipGroup)
        private eogRepository: IBaseRepository<EntityOwnershipGroup>,
        private userService: UserService,
        private mapper: EntityOwnershipMapper,
    ) { }

    public async removeUserCapability(eo: EntityOwnershipUserCheck) {
        const searchKeys: EntityOwnershipSearch = {
            entityGroup: eo.entityGroup,
            entityId: eo.entityId,
            entityName: eo.entityName,
        };

        if ((this.eoRepository as any).repo !== undefined) {
            // SQL
            const exist = await this.eoRepository.findOne(searchKeys);
            if (exist) {
                exist.userCapabilities = exist.userCapabilities?.filter(
                    (uc) => uc.userId !== eo.userId,
                ) || [];
                await this.eoRepository.save(exist);
            }
            return { modifiedCount: exist ? 1 : 0 };
        } else {
            // Mongo
            const rawModel = (this.eoRepository as any).model;
            const updateResult = await rawModel.updateOne(searchKeys, {
                $pull: {
                    userCapabilities: {
                        userId: eo.userId,
                    },
                },
            });
            return updateResult;
        }
    }

    private async findEntitiesBySearchKeys(
        searchKeys: EntityOwnershipSearch,
    ): Promise<EntityOwnership[]> {
        return await this.eoRepository.find(
            { ...(searchKeys.entityId ? { entityId: searchKeys.entityId } : {}), entityGroup: searchKeys.entityGroup, entityName: searchKeys.entityName }
        );
    }

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

    private async findUserCapabilityInGroup(
        entityOwnership: EntityOwnership,
        userCheck: EntityOwnershipUserCheck,
    ): Promise<Optional<UserCapabilityDTO>> {
        if (!entityOwnership?.entityOwnershipGroupId) return null;

        let ownerShipGroup: EntityOwnershipGroup | null;
        if ((this.eogRepository as any).repo !== undefined) {
            // SQL
            ownerShipGroup = await this.eogRepository.findById(
                entityOwnership.entityOwnershipGroupId,
            );
            if (ownerShipGroup) {
                const hasMatch = ownerShipGroup.userCapabilities?.some(
                    (uc) =>
                        uc.userId === userCheck.userId &&
                        uc.entityCapabilities?.some(
                            (ec) =>
                                ec.entityGroup === userCheck.entityGroup &&
                                ec.entityName === userCheck.entityName &&
                                (!userCheck.capabilityAtLeastOne?.length ||
                                    userCheck.capabilityAtLeastOne.includes(ec.capability)),
                        ),
                );
                if (!hasMatch) {
                    ownerShipGroup = null;
                }
            }
        } else {
            // Mongo
            const rawModel = (this.eogRepository as any).model;
            ownerShipGroup = await rawModel.findOne({
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
        }

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

    private async checkRoleOverride(
        roleOverrides: string[],
        userId: string,
        capability?: string,
    ): Promise<Optional<UserCapabilityDTO>> {
        if (!roleOverrides?.length || !userId) return null;

        const user: Optional<UserAuthBackendDTO> =
            await this.userService.findUserAuthBackend(userId);
        if (!user?.roles?.length) return null;

        if (user.roles.includes('ADMIN')) {
            return {
                userId: user.id,
                capability: capability?.toString(),
            };
        }

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

    private async findEntityOwnershipGroupsByUser(
        eo: EntityOwnershipUserSearch,
    ): Promise<EntityOwnershipGroup[]> {
        if ((this.eogRepository as any).repo !== undefined) {
            // SQL
            const all = await this.eogRepository.findAll();
            return all.filter((eog) =>
                eog.userCapabilities?.some(
                    (uc) =>
                        uc.userId === eo.userId &&
                        (!eo.capabilityAtLeastOne ||
                            uc.entityCapabilities?.some(
                                (ec) =>
                                    ec.entityGroup === eo.entityGroup &&
                                    ec.entityName === eo.entityName &&
                                    eo.capabilityAtLeastOne!.includes(ec.capability),
                            )),
                ),
            );
        } else {
            // Mongo
            const rawModel = (this.eogRepository as any).model;
            return await rawModel.find({
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
            await this.eoRepository.save(entity);
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

        await this.eoRepository.save(entity);
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

    private async updateExistingUserCapability(
        searchKeys: EntityOwnershipSearch,
        oe: EntityOwnershipInsertCapabiltyDTO,
    ): Promise<void> {
        if ((this.eoRepository as any).repo !== undefined) {
            // SQL
            const exist = await this.eoRepository.findOne({
                ...searchKeys,
            });
            if (exist) {
                const uc = exist.userCapabilities?.find((u) => u.userId === oe.userId);
                if (uc) {
                    uc.capability = oe.capability;
                    await this.eoRepository.save(exist);
                }
            }
        } else {
            // Mongo
            const rawModel = (this.eoRepository as any).model;
            const updateResult = await rawModel.updateOne(
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
    }

    private async addNewUserCapability(
        searchKeys: EntityOwnershipSearch,
        oe: EntityOwnershipInsertCapabiltyDTO,
    ): Promise<void> {
        const foundEntities = await this.findEntitiesBySearchKeys(searchKeys);
        if (foundEntities.length > 0) {
            const entity = foundEntities[0];
            entity.userCapabilities = entity.userCapabilities || [];
            entity.userCapabilities.push({
                capability: oe.capability,
                userId: oe.userId,
            });
            await this.eoRepository.save(entity);
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

        const entityOwnership = (await this.findEntitiesBySearchKeys({
            entityGroup: entityOwnershipUserCheck.entityGroup,
            entityName: entityOwnershipUserCheck.entityName,
            ...(entityOwnershipUserCheck.entityId ? { entityId: entityOwnershipUserCheck.entityId } : {}),
        }))[0];

        if (!entityOwnership) return null;

        let found = this.findUserCapabilityInEntity(
            entityOwnership,
            entityOwnershipUserCheck.userId,
            entityOwnershipUserCheck.capabilityAtLeastOne,
        );

        if (!found) {
            found = await this.findUserCapabilityInGroup(
                entityOwnership,
                entityOwnershipUserCheck,
            );
        }

        if (!found && checkRoleOverride) {
            const roleOverrides =
                entityOwnership.overriderRoles ||
                (entityOwnership.entityOwnershipGroupId
                    ? (
                        await this.eogRepository.findById(
                            entityOwnership.entityOwnershipGroupId,
                        )
                    )?.overriderRoles
                    : undefined);

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

        if ((this.eoRepository as any).repo !== undefined) {
            // SQL
            const all = await this.eoRepository.find({
                entityGroup: eo.entityGroup,
                entityName: eo.entityName,
            });
            const eogIds = eogsByUser.map((eog) => (eog.id || eog._id).toString());
            return all.filter((eoItem) => {
                if (!eoItem.entityId) return false;
                const hasDirectCap = eoItem.userCapabilities?.some(
                    (uc) =>
                        uc.userId === eo.userId &&
                        (!eo.capabilityAtLeastOne ||
                            eo.capabilityAtLeastOne!.includes(uc.capability!)),
                );
                if (hasDirectCap) return true;
                if (eoItem.entityOwnershipGroupId && eogIds.includes(eoItem.entityOwnershipGroupId.toString())) {
                    return true;
                }
                return false;
            });
        } else {
            // Mongo
            const rawModel = (this.eoRepository as any).model;
            const eogIds = eogsByUser.map((eog) => eog.id || eog._id);
            const eos = await rawModel.find({
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
                    ...(eogIds.length
                        ? [
                            {
                                entityOwnershipGroupId: {
                                    $in: eogIds,
                                },
                            },
                        ]
                        : []),
                ],
            });
            return eos;
        }
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

        const eos = await this.eoRepository.find({
            entityGroup: eo.entityGroup,
            entityName: eo.entityName,
            entityId: QueryOperators.NotEqual(null),
            entityOwnershipGroupId: eo.entityOwnershipGroupId,
        });
        return eos.map((a) => a.entityId?.toString()!);
    }

    async hasOwnershipsByEogId(
        eogId: string,
    ): Promise<boolean> {
        const eos = await this.eoRepository.find({
            entityOwnershipGroupId: eogId,
        });
        return eos?.length > 0;
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
        await this.eoRepository.deleteMany(sk);
    }

    private async findRaw(
        searchKeys: EntityOwnershipSearch,
    ): Promise<EntityOwnership[]> {
        return this.findEntitiesBySearchKeys(searchKeys);
    }
}
