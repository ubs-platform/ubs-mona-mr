import {
    Body,
    Controller,
    Delete,
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

@Controller('api-key')
@UseGuards(JwtAuthLocalGuard)
export class ApiKeyController {
    constructor(private readonly apiKeyService: ApiKeyService) {}

    /**
     * Create a new API key.
     * The raw key is returned ONLY in this response — it cannot be retrieved later.
     */
    @Post()
    async create(
        @Body() dto: ApiKeyCreateDTO,
        @CurrentUser() user: UserDTO,
    ): Promise<ApiKeyCreatedResponseDTO> {
        return this.apiKeyService.create(user.id, dto);
    }

    /**
     * List all API keys owned by the current user.
     */
    @Get()
    async listMine(@CurrentUser() user: UserDTO): Promise<ApiKeyDTO[]> {
        return this.apiKeyService.listByUser(user.id);
    }

    /**
     * List all API keys belonging to an ownership group.
     * The requesting user must be a member of the group (enforced at service level later).
     */
    @Get('group/:groupId')
    async listByGroup(
        @Param('groupId') groupId: string,
        @CurrentUser() user: UserDTO,
    ): Promise<ApiKeyDTO[]> {
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
}
