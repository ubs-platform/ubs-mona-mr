import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Optional } from '@ubs-platform/crud-base-common/utils';
import {
    EntityOwnershipGroup,
    GroupUserCapability,
} from '@ubs-platform/users-entity-mongo';
import { EntityOwnershipGroupMapper } from '../mapper/entity-ownership-group.mapper';
import {
    EntityOwnershipGroupCommonDTO,
    EntityOwnershipGroupDTO,
    EntityOwnershipGroupMetaDTO,
    EntityOwnershipGroupSearchDTO,
    EOGCheckUserGroupCapabilityDTO,
    EOGUserCapabilityDTO,
    EOGUserCapabilityInvitationDTO,
    EOGUserCapabilityInviteDTO,
    EOGUserEntityCapabilityDTO,
    GroupCapability,
} from 'libs/users-common/src/entity-ownership-group';
import { UserService } from './user.service';
import { EntityOwnershipGroupInvitation } from '@ubs-platform/users-entity-mongo';
import {
    UserAuthBackendDTO,
    UserCapabilityDTO,
} from '@ubs-platform/users-common';
import { EmailService } from './email.service';
import { SearchRequest } from '@ubs-platform/crud-base-common/search-request';
import { SearchResult, RawSearchResult } from '@ubs-platform/crud-base-common/search-result';
import { MongooseSearchUtil } from '@ubs-platform/crud-base';
import { NotFoundError } from 'rxjs';
import { EntityOwnershipService } from './entity-ownership.service';
import { EntityOwnership } from '@ubs-platform/users-entity-mongo';
import { InjectBaseRepository, IBaseRepository, QueryOperators } from '@ubs-platform/entity-base';

@Injectable()
export class EntityOwnershipGroupService {
    private readonly logger = new Logger(EntityOwnershipGroupService.name, {
        timestamp: true,
    });

    constructor(
        @InjectBaseRepository(EntityOwnershipGroup)
        private eogRepository: IBaseRepository<EntityOwnershipGroup>,
        @InjectBaseRepository(EntityOwnershipGroupInvitation)
        private eogInvitationRepository: IBaseRepository<EntityOwnershipGroupInvitation>,
        private mapper: EntityOwnershipGroupMapper,
        private userServiceLocal: UserService,
        private emailService: EmailService,
        @InjectBaseRepository(EntityOwnership)
        private eoRepository: IBaseRepository<EntityOwnership>,
    ) {}

    async deleteGroup(id: string) {
        await this.eogRepository.delete(id);
    }

    async createGroup(
        eogDto: EntityOwnershipGroupCommonDTO,
        userId: string,
    ): Promise<EntityOwnershipGroupCommonDTO> {
        this.logger.debug('EOG CREATE', eogDto.name);
        const entity = await this.mapper.toEntityCreate(eogDto, userId);
        const saved = await this.eogRepository.save(entity);
        return this.mapper.toDto(saved);
    }

    async editMeta(data: EntityOwnershipGroupMetaDTO) {
        const a = await this.eogRepository.findById(data.id);
        if (!a) {
            throw new Error('EntityOwnershipGroup not found');
        }
        a.name = data.name;
        a.description = data.description;
        const saved = await this.eogRepository.save(a);
        return this.mapper.toDto(saved);
    }

    async fetchUsersInGroup(id: string): Promise<EOGUserCapabilityDTO[]> {
        const found = await this.eogRepository.findById(id);

        if (!found) {
            throw new Error('EntityOwnershipGroup not found');
        }

        return found.userCapabilities.map((a) => {
            return this.capabilityToDto(a);
        });
    }

    private capabilityToDto(a: GroupUserCapability): EOGUserCapabilityDTO {
        return {
            userId: a.userId!,
            entityCapabilities: a.entityCapabilities?.map((ec) => ({
                entityGroup: ec.entityGroup,
                entityName: ec.entityName,
                capability: ec.capability,
            })),
            groupCapability: a.groupCapability,
            userFullName: a.userFullName,
        };
    }

    async hasUserGroupCapability(
        eogCheckCap: EOGCheckUserGroupCapabilityDTO,
    ): Promise<boolean> {
        const group = await this.getById(eogCheckCap.entityOwnershipGroupId);
        if (!group) {
            throw new Error('EntityOwnershipGroup not found');
        }
        return (
            group.userCapabilities?.some(
                (uc) =>
                    uc.userId === eogCheckCap.userId &&
                    eogCheckCap.groupCapabilitiesAtLeastOne.includes(
                        uc.groupCapability,
                    ),
            ) || false
        );
    }

    async findGroupsUserIn(
        userIds: string[],
    ): Promise<EntityOwnershipGroupCommonDTO[]> {
        let entities: EntityOwnershipGroup[];
        if ((this.eogRepository as any).repo !== undefined) {
            const all = await this.eogRepository.findAll();
            entities = all.filter((e) =>
                e.userCapabilities?.some((uc) => userIds.includes(uc.userId!)),
            );
        } else {
            entities = await this.eogRepository.find({
                'userCapabilities.userId': QueryOperators.In(userIds),
            });
        }
        return entities.map((e) => this.mapper.toDto(e));
    }

    async getByIdPublic(id: string): Promise<EntityOwnershipGroupCommonDTO> {
        const entity = await this.eogRepository.findById(id);
        if (!entity) {
            throw new NotFoundException('EntityOwnershipGroup');
        }
        return await this.mapper.toDto(entity);
    }

    async getById(id: string): Promise<Optional<EntityOwnershipGroup>> {
        return this.eogRepository.findById(id);
    }

    private filterEntityGroupsInJs(
        entities: EntityOwnershipGroup[],
        searchAndPagination?: EntityOwnershipGroupSearchDTO & SearchRequest,
    ): EntityOwnershipGroup[] {
        if (!searchAndPagination) return entities;
        let filtered = entities;
        if (searchAndPagination.description) {
            const descLower = searchAndPagination.description.toLowerCase();
            filtered = filtered.filter((e) =>
                e.description?.toLowerCase().includes(descLower),
            );
        }
        if (searchAndPagination.name) {
            const nameLower = searchAndPagination.name.toLowerCase();
            filtered = filtered.filter((e) =>
                e.name?.toLowerCase().includes(nameLower),
            );
        }
        if (searchAndPagination.memberUserId) {
            filtered = filtered.filter((e) =>
                e.userCapabilities?.some(
                    (uc) => uc.userId === searchAndPagination.memberUserId,
                ),
            );
        }
        if (searchAndPagination.sortBy) {
            const key = searchAndPagination.sortBy as keyof EntityOwnershipGroup;
            const rotation = searchAndPagination.sortRotation || 'ASC';
            filtered.sort((a, b) => {
                const valA = a[key] ?? '';
                const valB = b[key] ?? '';
                if (valA < valB) return rotation === 'ASC' ? -1 : 1;
                if (valA > valB) return rotation === 'ASC' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }

    async searchAll(
        searchAndPagination?: EntityOwnershipGroupSearchDTO & SearchRequest,
        user?: UserAuthBackendDTO,
    ): Promise<EntityOwnershipGroupCommonDTO[]> {
        if ((this.eogRepository as any).repo !== undefined) {
            const all = await this.eogRepository.findAll();
            const filtered = this.filterEntityGroupsInJs(all, searchAndPagination);
            return filtered.map((e) => this.mapper.toDto(e));
        } else {
            let s = await this.searchParams(searchAndPagination);
            let sort;
            if (searchAndPagination?.sortBy && searchAndPagination.sortRotation) {
                sort = {};
                sort[searchAndPagination.sortBy] = searchAndPagination.sortRotation;
            }
            const options = sort ? { sort } : undefined;
            const entities = await this.eogRepository.find(s, options);
            return entities.map((a) => this.mapper.toDto(a));
        }
    }

    async searchPagination(
        searchAndPagination?: EntityOwnershipGroupSearchDTO & SearchRequest,
        user?: UserAuthBackendDTO,
    ): Promise<SearchResult<EntityOwnershipGroupCommonDTO>> {
        const page = searchAndPagination?.page || 0;
        const size = searchAndPagination?.size || 10;

        if ((this.eogRepository as any).repo !== undefined) {
            const all = await this.eogRepository.findAll();
            const filtered = this.filterEntityGroupsInJs(all, searchAndPagination);
            const total = filtered.length;
            const start = page * size;
            const paginated = filtered.slice(start, start + size);
            const maxPagesIndex = size ? Math.max(0, Math.ceil(total / size) - 1) : 0;
            const searchResult = new RawSearchResult<EntityOwnershipGroup>(
                paginated,
                page,
                size,
                total,
                maxPagesIndex,
                maxPagesIndex === page,
                page === 0
            );
            return searchResult.map((a) => this.mapper.toDto(a));
        } else {
            let s = await this.searchParams(searchAndPagination);
            let sort;
            if (searchAndPagination?.sortBy && searchAndPagination.sortRotation) {
                sort = {};
                sort[searchAndPagination.sortBy] = searchAndPagination.sortRotation;
            }
            const rawModel = (this.eogRepository as any).model;
            const result = await MongooseSearchUtil.modelSearch(rawModel, size, page, sort, {
                $match: s,
            });
            return result.mapAsync((a) => this.mapper.toDto(a as EntityOwnershipGroup));
        }
    }

    searchParams(
        searchAndPagination:
            | (EntityOwnershipGroupSearchDTO & SearchRequest)
            | undefined,
    ) {
        const s: any = {};
        if (searchAndPagination?.description) {
            s.description = {
                $regex: new RegExp(searchAndPagination.description, 'i'),
            };
        }
        if (searchAndPagination?.name) {
            s.name = {
                $regex: new RegExp(searchAndPagination.name, 'i'),
            };
        }
        if (searchAndPagination?.memberUserId) {
            s['userCapabilities.userId'] = searchAndPagination.memberUserId;
        }
        return s;
    }

    async searchByUserId(
        userId: string,
        capacity: string | undefined,
    ): Promise<EntityOwnershipGroupCommonDTO[]> {
        let entities: EntityOwnershipGroup[];
        if ((this.eogRepository as any).repo !== undefined) {
            const all = await this.eogRepository.findAll();
            entities = all.filter((e) =>
                e.userCapabilities?.some(
                    (uc) =>
                        uc.userId === userId &&
                        (capacity === undefined ||
                            uc.groupCapability === capacity ||
                            (uc as any).capability === capacity),
                ),
            );
        } else {
            const query: any = {
                'userCapabilities.userId': userId,
            };
            if (capacity !== undefined) {
                query['userCapabilities.groupCapability'] = capacity;
            }
            entities = await this.eogRepository.find(query);
        }
        return entities.map((e) => this.mapper.toDto(e));
    }

    async addUserCapability(
        groupId: string,
        userCapability: EOGUserCapabilityDTO,
    ): Promise<EntityOwnershipGroupCommonDTO> {
        const group = await this.getById(groupId);
        if (!group) {
            throw new Error('EntityOwnershipGroup not found');
        }

        const user = await this.userServiceLocal.findById(
            userCapability.userId,
        );
        userCapability.userFullName = user?.name + ' ' + user?.surname;

        if (
            group.userCapabilities?.some(
                (uc) => uc.userId === userCapability.userId,
            )
        ) {
            this.logger.debug(
                'UserCapability already exists in group',
                groupId,
                userCapability,
            );
            return this.mapper.toDto(group);
        }

        group.userCapabilities = group.userCapabilities || [];
        group.userCapabilities.push(userCapability);
        const saved = await this.eogRepository.save(group);
        return this.mapper.toDto(saved);
    }

    async removeUserCapability(groupId: string, userId: string): Promise<void> {
        const group = await this.getById(groupId);
        if (!group) {
            throw new Error('EntityOwnershipGroup not found');
        }

        group.userCapabilities = group.userCapabilities?.filter(
            (uc) => !(uc.userId === userId),
        );
        await this.eogRepository.save(group);
    }

    async updateUserCapability(
        groupId: string,
        userCapability: EOGUserCapabilityDTO,
    ): Promise<EntityOwnershipGroupCommonDTO> {
        const group = await this.eogRepository.findById(groupId);

        if (!group) {
            throw new Error('EntityOwnershipGroup not found');
        }

        const index = group.userCapabilities?.findIndex(
            (uc) => uc.userId === userCapability.userId,
        );
        if (index === undefined || index < 0) {
            throw new Error('UserCapability not found in group');
        }
        group.userCapabilities[index].entityCapabilities =
            userCapability.entityCapabilities;
        group.userCapabilities[index].groupCapability =
            userCapability.groupCapability;
        const saved = await this.eogRepository.save(group);
        return this.mapper.toDto(saved);
    }

    async addUserCapabilityInvite(
        groupId: string,
        userCapability: EOGUserCapabilityInviteDTO,
        currentUser: UserAuthBackendDTO,
    ): Promise<void> {
        const group = await this.getById(groupId);
        if (!group) {
            throw new Error('EntityOwnershipGroup not found');
        }

        const userInvited = await this.userServiceLocal.findUserByLogin({
            login: userCapability.userLogin,
            password: '',
        });
        if (!userInvited) {
            throw new Error('Invited user not found');
        }

        const invitedByName = `${currentUser.name} ${currentUser.surname}`;
        const name = group.name;
        const emailTemplate = 'lotus-publisher-team-invitation';
        const emailSubject = 'ubs-user-email-change-title';

        if (
            group.userCapabilities?.some((uc) => uc.userId === userInvited.id)
        ) {
            this.logger.debug(
                'UserCapability already exists in group',
                groupId,
                userCapability,
            );
            return;
        }

        let existingInvite = await this.eogInvitationRepository.findOne({
            entityOwnershipGroupId: groupId,
            invitedUserName: userCapability.userLogin,
        });
        const eogCapabilities = userCapability.entityCapabilities;
        if (!existingInvite) {
            existingInvite = {
                invitedUserName: `${userInvited.name} ${userInvited.surname}`,
                invitedUserId: userInvited.id,
                invitedByUserId: currentUser.id,
                invitedByUserName: invitedByName,
                entityOwnershipGroupId: groupId,
                groupCapability: userCapability.groupCapability,
                entityCapabilities:
                    this.eogCapabilitiesToEntity(eogCapabilities),
                eogName: group.name,
                eogId: (group.id || group._id).toString(),
                eogDescription: group.description,
            } as any;
        }

        await this.eogInvitationRepository.save(existingInvite!);

        await this.emailService.sendEmail(
            userInvited,
            emailSubject,
            emailTemplate,
            {
                name,
                invitedBy: invitedByName,
            },
        );
    }

    private eogCapabilitiesToEntity(
        eogCapabilities: EOGUserEntityCapabilityDTO[],
    ): EOGUserEntityCapabilityDTO[] {
        return eogCapabilities.map((ec) => ({
            entityGroup: ec.entityGroup,
            entityName: ec.entityName,
            capability: ec.capability,
        }));
    }

    async addUserCapabilityAcceptInvite(
        inviteId: string,
        currentUser: UserAuthBackendDTO,
    ): Promise<void> {
        const invite = await this.eogInvitationRepository.findOne({
            id: inviteId,
        });
        if (!invite) {
            throw new Error('Invitation not found');
        }

        if (invite.invitedUserId !== currentUser.id) {
            throw new Error('Invitation does not belong to the current user');
        }

        const group = await this.getById(invite.entityOwnershipGroupId);
        if (!group) {
            throw new Error('EntityOwnershipGroup not found');
        }

        const userCapability: EOGUserCapabilityDTO = {
            userId: invite.invitedUserId,
            entityCapabilities: invite.entityCapabilities?.map((ec) => ({
                entityGroup: ec.entityGroup,
                entityName: ec.entityName,
                capability: ec.capability,
            })),
            userFullName: invite.invitedUserName,
            groupCapability: invite.groupCapability,
        };

        await this.addUserCapability((group.id || group._id).toString(), userCapability);

        await this.eogInvitationRepository.delete(inviteId);
        await this.removeUserInEntityCapability(group, invite);
    }

    private async removeUserInEntityCapability(group: EntityOwnershipGroup, invite: EntityOwnershipGroupInvitation) {
        const groupId = (group.id || group._id).toString();
        if ((this.eoRepository as any).repo !== undefined) {
            const eos = await this.eoRepository.find({
                entityOwnershipGroupId: groupId,
            });
            for (const eo of eos) {
                const hasUser = eo.userCapabilities?.some((uc) => uc.userId === invite.invitedUserId);
                if (hasUser) {
                    eo.userCapabilities = eo.userCapabilities.filter((uc) => uc.userId !== invite.invitedUserId);
                    await this.eoRepository.save(eo);
                }
            }
        } else {
            const rawModel = (this.eoRepository as any).model;
            await rawModel
                .updateMany(
                    {
                        entityOwnershipGroupId: groupId,
                        userCapabilities: {
                            $elemMatch: { userId: invite.invitedUserId },
                        },
                    },
                    {
                        $pull: {
                            userCapabilities: { userId: invite.invitedUserId },
                        },
                    }
                )
                .exec();
        }
    }

    async removeInvitationAdmin(invitationId: string) {
        await this.eogInvitationRepository.delete(invitationId);
    }

    async refuseUserCapabilityInvite(
        inviteId: string,
        currentUser: UserAuthBackendDTO,
    ) {
        if ((this.eogInvitationRepository as any).repo !== undefined) {
            const invite = await this.eogInvitationRepository.findOne({
                id: inviteId,
                invitedUserId: currentUser.id,
            });
            if (invite) {
                await this.eogInvitationRepository.delete(inviteId);
            }
        } else {
            const rawModel = (this.eogInvitationRepository as any).model;
            await rawModel.findOneAndDelete({
                _id: inviteId,
                invitedUserId: currentUser.id,
            }).exec();
        }
    }

    async fetchCurrentUserInvitations(
        currentUserId: string,
    ): Promise<EOGUserCapabilityInvitationDTO[]> {
        return this.eogInvitationRepository
            .find({ invitedUserId: currentUserId })
            .then((invitations) =>
                invitations.map((invite) => this.invitationToDto(invite)),
            );
    }

    private invitationToDto(
        invite: EntityOwnershipGroupInvitation,
    ): EOGUserCapabilityInvitationDTO {
        return {
            entityCapabilities: this.eogEntityCapabilitiesToDto(invite),
            userId: invite.invitedUserId,
            groupCapability: invite.groupCapability,
            userName: invite.invitedUserName,
            invitedByUserId: invite.invitedByUserId,
            invitedByUserName: invite.invitedByUserName,
            invitationId: (invite.id || invite._id).toString(),
            eogName: invite.eogName,
            eogId: invite.eogId,
            eogDescription: invite.eogDescription,
            inivitationId: (invite.id || invite._id).toString(),
        } as EOGUserCapabilityInvitationDTO;
    }

    private eogEntityCapabilitiesToDto(
        invite: EntityOwnershipGroupInvitation,
    ): EOGUserEntityCapabilityDTO[] {
        return invite.entityCapabilities.map((ec) => ({
            entityGroup: ec.entityGroup,
            entityName: ec.entityName,
            capability: ec.capability,
        }));
    }

    async fetchUserCapabilityInvitations(
        id: string,
    ): Promise<EOGUserCapabilityInvitationDTO[]> {
        return this.eogInvitationRepository
            .find({ entityOwnershipGroupId: id })
            .then((invitations) =>
                invitations.map((invite) => this.invitationToDto(invite)),
            );
    }
}
