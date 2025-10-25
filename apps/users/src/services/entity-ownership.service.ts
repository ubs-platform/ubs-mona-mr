import { Injectable, Logger } from '@nestjs/common';
import { Model } from 'mongoose';
import { EntityOwnership } from '../domain/entity-ownership.schema';
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
    ) { }

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
        let entity;
        const found = await this.findRaw(searchKeys);
        if (found.length > 0) {
            entity = found[0];
            this.mapper.toEntityEdit(entity, eoDto);
        } else {
            entity = this.mapper.toEntity(eoDto);
        }

        await entity.save();
    }

    public async insertUserCapability(oe: EntityOwnershipInsertCapabiltyDTO) {
        // Ekleneceği zaman rol kontrol edilmeyebilir, çünkü sonradan override edilebilir
        const hasRoleAlready = await this.findInsertedUserCapability(oe, false);
        const searchKeys: EntityOwnershipSearch = {
            entityGroup: oe.entityGroup,
            entityId: oe.entityId,
            entityName: oe.entityName,
        };
        if (hasRoleAlready?.userId) {
            if (hasRoleAlready.capability != oe.capability) {
                const updateExistOne = await this.eoModel.updateOne(
                    { ...searchKeys, 'userCapabilities.userId': oe.userId },
                    {
                        $set: {
                            'userCapabilities.$[related].capability':
                                oe.capability,
                        },
                    },
                    { arrayFilters: [{ 'related.userId': oe.userId }] },
                );
                if (updateExistOne.modifiedCount == 0) {
                    console.warn(
                        'Zaten var olan kullanıcının capabilitysi güncellenecekti ama kaydedilen yok gibi',
                    );
                }
            }
        } else {
            const found = await this.findRaw(searchKeys);
            if (found.length > 0) {
                const entity = found[0];
                entity.userCapabilities.push({
                    capability: oe.capability,
                    userId: oe.userId,
                });
                await entity.save();
            }
        }
    }

    public async hasInsertedUserCapability(
        eouc: EntityOwnershipUserCheck,
        checkRoleOverride: boolean,
    ): Promise<boolean> {
        const found = await this.findInsertedUserCapability(eouc, checkRoleOverride);
        return !!found;
    }

    public async findInsertedUserCapability(
        eouc: EntityOwnershipUserCheck,
        checkRoleOverride: boolean,
    ): Promise<Optional<UserCapabilityDTO>> {
        this.logger.debug({ cap: eouc.capability });
        const entityOwnership = await this.eoModel.findOne({
            entityGroup: eouc.entityGroup,
            entityId: eouc.entityId,
            entityName: eouc.entityName,
            // "userCapabilities.userId": eouc.userId,
            // ...(eouc.capability ? { 'userCapabilities.capability': eouc.capability } : {}),
        });
        let found;
        let roleOverrides: Optional<string[]> = null;

        // checking inside entityOwnership's userCapabilities
        if (entityOwnership && entityOwnership.userCapabilities.length) {
            found = entityOwnership.userCapabilities.find(
                (uc) => uc.userId === eouc.userId && (!eouc.capability || uc.capability === eouc.capability),
            );
            roleOverrides = entityOwnership.overriderRoles;
        }
        // if not found, checking inside entityOwnershipGroup's userCapabilities
        if (!found && entityOwnership && entityOwnership.entityOwnershipGroupId) {
            const ownerShipGroup = await this.eogModel.findOne({
                _id: entityOwnership.entityOwnershipGroupId
            });
            if (ownerShipGroup && ownerShipGroup.userCapabilities.length) {
                found = ownerShipGroup.userCapabilities.find(
                    (uc) => uc.userId === eouc.userId && (!eouc.capability || uc.capability === eouc.capability),
                );
                if (!roleOverrides) {
                    roleOverrides = ownerShipGroup.overriderRoles;
                }
            }
        }
        // if not found, checking overriderRoles with user roles
        if (!found && roleOverrides?.length && eouc.userId && checkRoleOverride) {
            let user: Optional<UserAuthBackendDTO> = await this.userService.findUserAuthBackend(eouc.userId);

            // Admin overrides all
            if (user && user.roles?.includes('ADMIN')) {
                return {
                    userId: user.id,
                    capability: eouc.capability?.toString(),
                };
            }
            // Check other roles
            if (!found && entityOwnership && roleOverrides.length && user?.roles?.length) {
                for (let index = 0; index < user.roles.length; index++) {
                    const userRole = user.roles[index];
                    const role = roleOverrides.includes(userRole);
                    if (role) {
                        found = {
                            userId: user.id,
                            capability: eouc.capability?.toString(),
                        };
                    }
                }
            }
        }
        if (!found) return null;
        return {
            capability: found.capability!,
            userId: found.userId!,
        };
    }

    async searchByUser(eo: EntityOwnershipUserSearch) {
        const eogsByUser = await this.eogModel.find({
            'userCapabilities.userId': eo.userId,
            ...(eo.capabilityAtLeastOne
                ? { 'userCapabilities.capability': { $in: eo.capabilityAtLeastOne } }
                : {}),
        });

        
        const entityOwnerships = await this.eoModel.find({
            entityGroup: eo.entityGroup,
            entityName: eo.entityName,
            $or: [
                {
                    'userCapabilities.userId': eo.userId,
                    ...(eo.capabilityAtLeastOne ? { 'userCapabilities.capability': { $in: eo.capabilityAtLeastOne } } : {}),
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

            // ...(eo.capability ? { capability: eo.capability } : {}),
        });
        return entityOwnerships.map((a) => this.mapper.toDto(a));
    }

    private async findExisting(
        eouc: EntityOwnershipUserCheck,
    ): Promise<EntityOwnershipDTO> {
        const entityOwnership = await this.eoModel.findOne({
            entityGroup: eouc.entityGroup,
            entityId: eouc.entityId,
            entityName: eouc.entityName,
        });
        return entityOwnership ? this.mapper.toDto(entityOwnership) : null!;
    }

    public async search(
        sk: EntityOwnershipSearch,
    ): Promise<EntityOwnershipDTO[]> {
        return (await this.findRaw(sk)).map((a) => this.mapper.toDto(a));
    }

    public async deleteOwnership(sk: EntityOwnershipSearch) {
        await this.eoModel.deleteOne({
            entityGroup: sk.entityGroup,
            entityId: sk.entityId,
            entityName: sk.entityName,
        });
    }

    private async findRaw(searchKeys: EntityOwnershipSearch) {
        return await this.eoModel.find(searchKeys);
    }
}
