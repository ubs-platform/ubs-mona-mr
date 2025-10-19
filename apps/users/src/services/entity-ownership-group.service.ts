import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Optional } from '@ubs-platform/crud-base-common/utils';
import { Model } from 'mongoose';
import { EntityOwnershipGroup } from '../domain/entity-ownership-group.schema';
import { EntityOwnershipGroupMapper } from '../mapper/entity-ownership-group.mapper';
import {
    EntityOwnershipGroupCreateDTO,
    EntityOwnershipGroupDTO,
    EOGUserCapabilityDTO,
    EOGUserCapabilityInviteDTO,
    GroupCapability,
} from 'libs/users-common/src/entity-ownership-group';
import { UserService } from './user.service';
import { EntityOwnershipGroupInvitation } from '../domain/entity-ownership-group-invitation.schema';
import { UserAuthBackendDTO } from '@ubs-platform/users-common';
import { EmailService } from './email.service';

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
        private emailService: EmailService
    ) { }

    async fetchUsersInGroup(id: string): Promise<EOGUserCapabilityDTO[]> {
        const found = await this.eogModel.findById(id).exec();

        if (!found) {
            throw new Error('EntityOwnershipGroup not found');
        }

        return found.userCapabilities.map((a) => {
            return {
                userId: a.userId!,
                capability: a.capability,
                groupCapability: a.groupCapability,
                userFullName: a.userFullName,
            };
        });
    }

    async createGroup(
        eogDto: EntityOwnershipGroupCreateDTO,
    ): Promise<EntityOwnershipGroup> {
        this.logger.debug('EOG CREATE', eogDto.groupName);
        const entity = await this.mapper.toEntityCreate(eogDto);
        await entity.save();
        return this.mapper.toDto(entity);
    }

    async hasUserGroupCapability(
        entityOwnershipGroupId: string,
        currentUserId: string,
        groupCapabilitiesAtLeastOne: GroupCapability[],
    ): Promise<boolean> {
        const group = await this.getById(entityOwnershipGroupId);
        if (!group) {
            throw new Error('EntityOwnershipGroup not found');
        }
        return (
            group.userCapabilities?.some(
                (uc) =>
                    uc.userId === currentUserId &&
                    groupCapabilitiesAtLeastOne.includes(uc.groupCapability),
            ) || false
        );
    }

    async findGroupsUserIn(
        userIds: string[],
    ): Promise<EntityOwnershipGroupDTO[]> {
        return this.eogModel
            .find({ 'userCapabilities.userId': { $in: userIds } })
            .exec()
            .then((entities) => entities.map((e) => this.mapper.toDto(e)));
    }

    async getById(id: string): Promise<Optional<EntityOwnershipGroup>> {
        return this.eogModel.findById(id).exec();
    }

    searchByUserId(
        userId: string,
        capacity: string | undefined,
    ): Promise<EntityOwnershipGroupDTO[]> {
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
    ): Promise<EntityOwnershipGroupDTO> {
        const group = await this.getById(groupId);
        if (!group) {
            throw new Error('EntityOwnershipGroup not found');
        }

        const user = await this.userServiceLocal.findById(userCapability.userId);
        userCapability.userFullName = user?.name + ' ' + user?.surname;

        if (
            group.userCapabilities?.some(
                (uc) =>
                    uc.userId === userCapability.userId &&
                    uc.capability === userCapability.capability,
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

    async addUserCapabilityInvite(
        groupId: string,
        userCapability: EOGUserCapabilityInviteDTO,
        currentUser: UserAuthBackendDTO
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
        const groupName = group.groupName;
        const emailTemplate = 'lotus-publisher-team-invitation';
        const emailSubject = 'ubs-user-email-change-title';
        const invitationKey = Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);

        // Eğer kullanıcı zaten grupta aynı capability ile varsa davet oluşturmaya gerek yok
        if (
            group.userCapabilities?.some(
                (uc) =>
                    uc.userId === userInvited.id &&
                    uc.capability === userCapability.capability
            )
        ) {
            this.logger.debug(
                'UserCapability already exists in group',
                groupId,
                userCapability
            );
            return;
        }

        let existingInvite = await this.eogInvitationModel
            .findOne({
                entityOwnershipGroupId: groupId,
                invitedUserName: userCapability.userLogin,
            })
            .exec();

        if (!existingInvite) {
            existingInvite = new this.eogInvitationModel({
                invitedUserName: `${userInvited.name} ${userInvited.surname}`,
                invitedUserId: userInvited.id,
                invitedByUserId: currentUser.id,
                invitedByUserName: invitedByName,
                entityOwnershipGroupId: groupId,
                groupCapability: userCapability.groupCapability,
                invitationKey,
            });
        }

        existingInvite.invitationKey = invitationKey;
        await existingInvite.save();

        await this.emailService.sendEmail(userInvited, emailSubject, emailTemplate, {
            invitationKey: existingInvite.invitationKey,
            groupName,
            invitedBy: invitedByName,
        });
    }

    async addUserCapabilityAcceptInvite(
        invitationKey: string,
        currentUser: UserAuthBackendDTO
    ): Promise<void> {
        const invite = await this.eogInvitationModel.findOne({ invitationKey });
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
            groupCapability: invite.groupCapability,
        };

        await this.addUserCapability(group._id!, userCapability);

        // Davet kullanıldıktan sonra silinir
        await this.eogInvitationModel.deleteOne({ _id: invite._id }).exec();
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
    ): Promise<EntityOwnershipGroupDTO> {
        const group = await this.getById(groupId);
        if (!group) {
            throw new Error('EntityOwnershipGroup not found');
        }

        const index = group.userCapabilities?.findIndex(
            (uc) => uc.userId === userCapability.userId,
        );
        if (index === undefined || index < 0) {
            throw new Error('UserCapability not found in group');
        }

        group.userCapabilities[index].capability = userCapability.capability;
        group.userCapabilities[index].groupCapability =
            userCapability.groupCapability;
        await (group as any).save();
        return this.mapper.toDto(group);
    }
}
