import {
    Body,
    Controller,
    Delete,
    Get,
    Injectable,
    Param,
    Post,
    Put,
    Query,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthLocalGuard } from '../guard/jwt-local.guard';
import {
    EntityOwnershipGroupCommonDTO,
    EntityOwnershipGroupDTO,
    EntityOwnershipGroupMetaDTO,
    EntityOwnershipGroupSearchDTO,
    EOGCheckUserGroupCapabilityDTO,
    EOGUserCapabilityDTO,
    EOGUserCapabilityInvitationDTO,
    EOGUserCapabilityInviteDTO,
    GroupCapability,
    UserAuthBackendDTO,
    UserCapabilityDTO,
} from '@ubs-platform/users-common';
import { EntityOwnershipGroupService } from '../services/entity-ownership-group.service';
import { CurrentUser } from '@ubs-platform/users-microservice-helper';
import { SearchRequest } from '@ubs-platform/crud-base-common/search-request';
import { EntityOwnershipService } from '../services/entity-ownership.service';

@Controller('entity-ownership-group')
export class EntityOwnershipGroupController {
    /**
     *
     */
    constructor(private eogService: EntityOwnershipGroupService, private eoService: EntityOwnershipService) { }

    async assertHasUserGroupCapability(
        currentUser: UserAuthBackendDTO, groupId: string, requiredCapabilities: GroupCapability[]
    ) {
        if (currentUser.roles.includes('ADMIN')) {
            return;
        }
        const hasCap = await this.eogService.hasUserGroupCapability(
            { userId: currentUser.id, entityOwnershipGroupId: groupId, groupCapabilitiesAtLeastOne: requiredCapabilities }
        );
        if (!hasCap) {
            throw new UnauthorizedException(
                `User ${currentUser.id} does not have capability ${requiredCapabilities} in entity ownership group ${groupId}`,
            );
        }
    }

    @UseGuards(JwtAuthLocalGuard)
    @Get(":id")
    async getOne(
        @Param('id') id: string,
        @CurrentUser() currentUser: UserAuthBackendDTO,
    ) {
        // Only users with global admin role can create EOGs
        this.assertHasUserGroupCapability(currentUser, id, ['OWNER', "EDITOR", "META_EDIT", "ONLY_EDIT_MEMBER_CAPABILITIES", "VIEWER"]);
        return await this.eogService.getByIdPublic(id);
    }

    @UseGuards(JwtAuthLocalGuard)
    @Get()
    async findAll(
        @Query() q: EntityOwnershipGroupSearchDTO,
        @Query() pagination: SearchRequest,
        @CurrentUser() currentUser: UserAuthBackendDTO,
    ) {
        if (q.admin === "true") {
            // Only users with global admin role can create EOGs
            if (!currentUser.roles.includes('ADMIN')) {
                throw new UnauthorizedException(
                    `User ${currentUser.id} cannot query EOGs for admin users`,
                );
            }
        } else {
            if (!q.memberUserId) {
                q.memberUserId = currentUser.id;
            } else if (q.memberUserId !== currentUser.id) {
                throw new UnauthorizedException(
                    `User ${currentUser.id} cannot query EOGs for other users`,
                );
            }
        }
        return await this.eogService.searchAll({ ...q, ...pagination }, currentUser);
    }

    @UseGuards(JwtAuthLocalGuard)
    @Get("_search")
    async searchAll(
        @Query() q: EntityOwnershipGroupSearchDTO,
        @Query() pagination: SearchRequest,
        @CurrentUser() currentUser: UserAuthBackendDTO,
    ) {
        if (q.admin === "true") {
            // Only users with global admin role can create EOGs
            if (!currentUser.roles.includes('ADMIN')) {
                throw new UnauthorizedException(
                    `User ${currentUser.id} cannot query EOGs for admin users`,
                );
            }
        } else {
            if (!q.memberUserId) {
                q.memberUserId = currentUser.id;
            } else if (q.memberUserId !== currentUser.id) {
                throw new UnauthorizedException(
                    `User ${currentUser.id} cannot query EOGs for other users`,
                );
            }
        }
        return await this.eogService.searchPagination({ ...q, ...pagination }, currentUser);
    }

    @UseGuards(JwtAuthLocalGuard)
    @Post()
    async createEntityOwnershipGroup(
        @Body() eogCreate: EntityOwnershipGroupCommonDTO,
        @CurrentUser() currentUser: UserAuthBackendDTO,
    ) {
        // Only users with global admin role can create EOGs
        return await this.eogService.createGroup(eogCreate, currentUser.id);
    }

    @UseGuards(JwtAuthLocalGuard)
    @Put()
    async editMeta(
        @Body() eogMetaDto: EntityOwnershipGroupMetaDTO,
        @CurrentUser() currentUser: UserAuthBackendDTO,
    ) {
        // Only users with global admin role can create EOGs
        this.assertHasUserGroupCapability(currentUser, eogMetaDto.id, ['OWNER', "EDITOR", "META_EDIT"]);

        return await this.eogService.editMeta(eogMetaDto);
    }


    @UseGuards(JwtAuthLocalGuard)
    @Delete(':id')
    async deleteEntityOwnershipGroup(
        @Param('id') id: string,
        @CurrentUser() currentUser: UserAuthBackendDTO,
    ) {
        if (await this.eoService.hasOwnershipsByEogId(id)) {
            throw new UnauthorizedException(
                `Entity Ownership Group ${id} cannot be deleted because it has owned entities.`,
            );
        }
        // Only users with global admin role can delete EOGs
        await this.assertHasUserGroupCapability(currentUser, id, ['OWNER']);

        return await this.eogService.deleteGroup(id);
    }
}
