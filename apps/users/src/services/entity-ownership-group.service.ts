import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Optional } from '@ubs-platform/crud-base-common/utils';
import { Document, Model, Types } from 'mongoose';
import {
    EntityOwnershipGroup,
    UserCapability,
} from '../domain/entity-ownership-group.schema';
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
import { EntityOwnershipGroupInvitation } from '../domain/entity-ownership-group-invitation.schema';
import {
    UserAuthBackendDTO,
    UserCapabilityDTO,
} from '@ubs-platform/users-common';
import { EmailService } from './email.service';
import { SearchRequest } from '@ubs-platform/crud-base-common/search-request';
import { SearchResult } from '@ubs-platform/crud-base-common/search-result';
import { SearchUtil } from '@ubs-platform/crud-base';
import { NotFoundError } from 'rxjs';
import { EntityOwnershipService } from './entity-ownership.service';
import { EntityOwnership } from '../domain/entity-ownership.schema';

@Injectable()
export class EntityOwnershipGroupService {
    private readonly logger = new Logger(EntityOwnershipGroupService.name, {
        timestamp: true,
    });

    constructor(
        @InjectModel(EntityOwnershipGroup.name)
        private eogModel: Model<EntityOwnershipGroup>,
        @InjectModel(EntityOwnershipGroupInvitation.name)
        private eogInvitationModel: Model<EntityOwnershipGroupInvitation>,
        private mapper: EntityOwnershipGroupMapper,
        private userServiceLocal: UserService,
        private emailService: EmailService,
        @InjectModel(EntityOwnership.name)
        private eoModel: Model<EntityOwnership>,
    ) {}

    async deleteGroup(id: string) {
        await this.eogModel.findByIdAndDelete(id).exec();
    }

    async createGroup(
        eogDto: EntityOwnershipGroupCommonDTO,
        userId: string,
    ): Promise<EntityOwnershipGroupCommonDTO> {
        this.logger.debug('EOG CREATE', eogDto.name);
        const entity = await this.mapper.toEntityCreate(eogDto, userId);
        await entity.save();
        return this.mapper.toDto(entity);
    }

    async editMeta(data: EntityOwnershipGroupMetaDTO) {
        const a = await this.eogModel.findById(data.id).exec();
        if (!a) {
            throw new Error('EntityOwnershipGroup not found');
        }
        a.name = data.name;
        a.description = data.description;
        await a.save();
        return this.mapper.toDto(a);
    }

    async fetchUsersInGroup(id: string): Promise<EOGUserCapabilityDTO[]> {
        const found = await this.eogModel.findById(id).exec();

        if (!found) {
            throw new Error('EntityOwnershipGroup not found');
        }

        return found.userCapabilities.map((a) => {
            return this.capabilityToDto(a);
        });
    }

    private capabilityToDto(a: UserCapability): EOGUserCapabilityDTO {
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
        return this.eogModel
            .find({ 'userCapabilities.userId': { $in: userIds } })
            .exec()
            .then((entities) => entities.map((e) => this.mapper.toDto(e)));
    }

    async getByIdPublic(id: string): Promise<EntityOwnershipGroupCommonDTO> {
        const entity = await this.eogModel.findById(id).exec();
        if (!entity) {
            throw new NotFoundException('EntityOwnershipGroup');
        }
        return await this.mapper.toDto(entity);
    }

    async getById(id: string): Promise<Optional<EntityOwnershipGroup>> {
        return this.eogModel.findById(id).exec();
    }

    async searchAll(
        searchAndPagination?: EntityOwnershipGroupSearchDTO & SearchRequest,
        user?: UserAuthBackendDTO,
    ): Promise<EntityOwnershipGroupCommonDTO[]> {
        let s = await this.searchParams(searchAndPagination); //{ ...searchAndPagination, page: undefined, size: undefined };
        let sort;
        if (searchAndPagination?.sortBy && searchAndPagination.sortRotation) {
            sort = {};
            sort[searchAndPagination.sortBy] = searchAndPagination.sortRotation;
        }
        return (await this.eogModel.find(s).sort(sort).exec()).map((a) =>
            this.mapper.toDto(a),
        );
    }

    async searchPagination(
        searchAndPagination?: EntityOwnershipGroupSearchDTO & SearchRequest,
        user?: UserAuthBackendDTO,
    ): Promise<SearchResult<EntityOwnershipGroupCommonDTO>> {
        const page = searchAndPagination?.page || 0,
            size = searchAndPagination?.size || 10;

        let s = await this.searchParams(searchAndPagination); //{ ...searchAndPagination, page: undefined, size: undefined };
        let sort;
        if (searchAndPagination?.sortBy && searchAndPagination.sortRotation) {
            sort = {};
            sort[searchAndPagination.sortBy] = searchAndPagination.sortRotation;
        }
        return (
            await SearchUtil.modelSearch(this.eogModel, size, page, sort, {
                $match: s,
            })
        ).mapAsync((a) => this.mapper.toDto(a));
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

    searchByUserId(
        userId: string,
        capacity: string | undefined,
    ): Promise<EntityOwnershipGroupCommonDTO[]> {
        return this.eogModel
            .find({
                'userCapabilities.userId': userId,
                'userCapabilities.capability': capacity,
            })
            .exec()
            .then((entities) => entities.map((e) => this.mapper.toDto(e)));
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
        await (group as any).save();
        return this.mapper.toDto(group);
    }

    async removeUserCapability(groupId: string, userId: string): Promise<void> {
        const group = await this.getById(groupId);
        if (!group) {
            throw new Error('EntityOwnershipGroup not found');
        }

        group.userCapabilities = group.userCapabilities?.filter(
            (uc) => !(uc.userId === userId),
        );
        await (group as any).save();
    }

    async updateUserCapability(
        groupId: string,
        userCapability: EOGUserCapabilityDTO,
    ): Promise<EntityOwnershipGroupCommonDTO> {
        const group = await this.eogModel.findById(groupId);

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
        group.markModified('userCapabilities');
        group.markModified('groupCapability');
        await (group as any).save();
        return this.mapper.toDto(group);
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
        // const invitationKey =
        //     Math.random().toString(36).substring(2, 15) +
        //     Math.random().toString(36).substring(2, 15);

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

        let existingInvite = await this.eogInvitationModel
            .findOne({
                entityOwnershipGroupId: groupId,
                invitedUserName: userCapability.userLogin,
            })
            .exec();
        const eogCapabilities = userCapability.entityCapabilities;
        if (!existingInvite) {
            existingInvite = new this.eogInvitationModel({
                invitedUserName: `${userInvited.name} ${userInvited.surname}`,
                invitedUserId: userInvited.id,
                invitedByUserId: currentUser.id,
                invitedByUserName: invitedByName,
                entityOwnershipGroupId: groupId,
                groupCapability: userCapability.groupCapability,
                entityCapabilities:
                    this.eogCapabilitiesToEntity(eogCapabilities),
                eogName: group.name,
                eogId: group._id,
                eogDescription: group.description,
            });
        }

        await existingInvite.save();

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
        const invite = await this.eogInvitationModel.findOne({
            _id: inviteId,
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
            // capability: invite.entityCapability,
            entityCapabilities: invite.entityCapabilities?.map((ec) => ({
                entityGroup: ec.entityGroup,
                entityName: ec.entityName,
                capability: ec.capability,
            })),
            userFullName: invite.invitedUserName,
            groupCapability: invite.groupCapability,
        };

        await this.addUserCapability(group._id!, userCapability);

        // Davet kullanıldıktan sonra silinir
        await this.eogInvitationModel.deleteOne({ _id: invite._id }).exec();
        await this.removeUserInEntityCapability(group, invite);
    }

    private async removeUserInEntityCapability(group: EntityOwnershipGroup, invite: Document<unknown, {}, EntityOwnershipGroupInvitation, {}> & EntityOwnershipGroupInvitation & { _id: Types.ObjectId; } & { __v: number; }) {
        await this.eoModel
            .updateMany(
                {
                    entityOwnershipGroupId: group._id!,
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

    async removeInvitationAdmin(invitationId: string) {
        await this.eogInvitationModel.findByIdAndDelete(invitationId);
    }

    async refuseUserCapabilityInvite(
        inviteId: string,
        currentUser: UserAuthBackendDTO,
    ) {
        await this.eogInvitationModel.findOneAndDelete({
            _id: inviteId,
            invitedUserId: currentUser.id,
        });
    }

    async fetchCurrentUserInvitations(
        currentUserId: string,
    ): Promise<EOGUserCapabilityInvitationDTO[]> {
        return this.eogInvitationModel
            .find({ invitedUserId: currentUserId })
            .exec()
            .then((invitations) =>
                invitations.map((invite) => this.invitationToDto(invite)),
            );
    }

    private invitationToDto(
        invite: EntityOwnershipGroupInvitation,
    ): EOGUserCapabilityInvitationDTO {
        return {
            // capability: invite.entityCapability,
            entityCapabilities: this.eogEntityCapabilitiesToDto(invite),
            userId: invite.invitedUserId,
            groupCapability: invite.groupCapability,
            userName: invite.invitedUserName,
            invitedByUserId: invite.invitedByUserId,
            invitedByUserName: invite.invitedByUserName,
            invitationId: invite._id,
            eogName: invite.eogName,
            eogId: invite.eogId,
            eogDescription: invite.eogDescription,
            inivitationId: invite._id,
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
        return this.eogInvitationModel
            .find({ entityOwnershipGroupId: id })
            .exec()
            .then((invitations) =>
                invitations.map((invite) => this.invitationToDto(invite)),
            );
    }
}
