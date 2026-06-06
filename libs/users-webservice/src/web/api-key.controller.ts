import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthLocalGuard } from '../guard/jwt-local.guard';
import { CurrentUser } from '../local-current-user-decorator';
import { ApiKeyService } from '../services/api-key.service';
import {
    ApiKeyCreateDTO,
    ApiKeyCreatedResponseDTO,
    ApiKeyDTO,
    UserDTO,
} from '@ubs-platform/users-common';
import { EntityOwnershipGroupService } from '../services/entity-ownership-group.service';

@Controller('api-key')
@UseGuards(JwtAuthLocalGuard)
export class ApiKeyController {
    constructor(private readonly apiKeyService: ApiKeyService, private readonly eogService: EntityOwnershipGroupService) { }

    /**
     * Create a new API key.
     * The raw key is returned ONLY in this response — it cannot be retrieved later.
     */
    @Post()
    async create(
        @Body() dto: ApiKeyCreateDTO,
        @CurrentUser() user: UserDTO,
    ): Promise<ApiKeyCreatedResponseDTO> {
        await this.assertOwnership({
            userId: dto.entityOwnershipGroupId ? undefined : user.id,
            entityOwnershipGroupId: dto.entityOwnershipGroupId ?? undefined,
        }, user.id, null); // check if user has access to create keys in general (will throw if not)
        return this.apiKeyService.create(user.id, dto);
    }

    /**
     * List all API keys owned by the current user.
     */
    @Get()
    @UseGuards(JwtAuthLocalGuard)
    async listMine(@CurrentUser() user: UserDTO): Promise<ApiKeyDTO[]> {
        return this.apiKeyService.listByUser(user.id);
    }

    /**
     * List all API keys belonging to an ownership group.
     * The requesting user must be a member of the group (enforced at service level later).
     */
    @Get('group/:groupId')
    @UseGuards(JwtAuthLocalGuard)
    async listByGroup(
        @Param('groupId') groupId: string,
        @CurrentUser() user: UserDTO,
    ): Promise<ApiKeyDTO[]> {
        await this.userGroupCheck(user.id, groupId); // will throw if user has no access to the group
        return this.apiKeyService.listByGroup(groupId);
    }

    /**
     * Revoke (soft-delete) an API key. The key remains in DB but can no longer authenticate.
     */
    @Post(':id/revoke')
    @HttpCode(HttpStatus.NO_CONTENT)
    async revoke(
        @Param('id') id: string,
        @CurrentUser() user: UserDTO,
    ): Promise<void> {
        return this.apiKeyService.revoke(user.id, id);
    }

    /**
     * Permanently delete an API key.
     */
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(
        @Param('id') id: string,
        @CurrentUser() user: UserDTO,
    ): Promise<void> {
        return this.apiKeyService.delete(user.id, id);
    }

    private async userGroupCheck(userId: string, groupId: string): Promise<void> {
        const existing = await this.eogService.searchAll({
            memberUserId: userId,
            id: groupId,
            page: 0,
            size: 1,
        })
        if (existing.length === 0) {
            throw new Error('Group not found or access denied');
        }
    }

    private async assertOwnership(
        doc: ApiKeyDTO | null,
        requestingUserId: string,
        keyId: string,
    ): Promise<void> {
        if (doc === null) {
            if (keyId != null) {
                doc = await this.apiKeyService.findById(keyId);
            } 
            if (doc === null) {
                throw new ForbiddenException('API key not found');
            }
            throw new Error('API key not found');
        }

        if (doc.entityOwnershipGroupId) {
            await this.userGroupCheck(requestingUserId, doc.entityOwnershipGroupId);
            return;
        }

        if (doc.userId !== requestingUserId) {
            throw new ForbiddenException('You do not own this API key');
        }
        return;
    }
}
