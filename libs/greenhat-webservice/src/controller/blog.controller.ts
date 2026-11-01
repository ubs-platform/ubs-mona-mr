import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
} from '@ubs-platform/users-microservice-helper';
import { Roles, RolesGuard } from '@ubs-platform/users-roles';
import {
  GreenhatBlogPageDTO,
  GreenhatBlogPostDTO,
  GreenhatBlogPostListItemDTO,
  GreenhatBlogPostPublishDTO,
  GreenhatBlogPostSaveDTO,
  GreenhatBlogPostSearchDTO,
  GreenhatBlogPublicPostDTO,
  GreenhatBlogPublicSearchDTO,
  GreenhatBlogPublicSummaryDTO,
} from '@ubs-platform/greenhat-common';
import { UserAuthBackendDTO } from '@ubs-platform/users-common';
import { BlogService } from '../service/blog.service';
import { MessagePattern } from '@nestjs/microservices';

interface FileUploadInfoRequest {
  userId: string;
  objectId: string;
  roles: string[];
}

@Controller('greenhat/blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) { }

  @Get('public')
  async listPublic(
    @Query() query: GreenhatBlogPublicSearchDTO,
  ): Promise<GreenhatBlogPageDTO<GreenhatBlogPublicSummaryDTO>> {
    return this.blogService.listPublic(query);
  }

  @Get('public/:slug')
  async getPublic(
    @Param('slug') slug: string,
    @Query('locale') locale?: string,
  ): Promise<GreenhatBlogPublicPostDTO> {
    return this.blogService.getPublicBySlug(slug, locale);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['ADMIN'])
  async listAdmin(
    @Query() query: GreenhatBlogPostSearchDTO,
  ): Promise<GreenhatBlogPageDTO<GreenhatBlogPostListItemDTO>> {
    return this.blogService.listAdmin(query);
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['ADMIN'])
  async getAdmin(@Param('id') id: string): Promise<GreenhatBlogPostDTO> {
    return this.blogService.getAdmin(id);
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['ADMIN'])
  async create(
    @Body() body: GreenhatBlogPostSaveDTO,
    @CurrentUser() user?: UserAuthBackendDTO,
  ): Promise<GreenhatBlogPostDTO> {
    return this.blogService.create(body, user!);
  }

  @Put('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['ADMIN'])
  async update(
    @Param('id') id: string,
    @Body() body: GreenhatBlogPostSaveDTO,
    @CurrentUser() user?: UserAuthBackendDTO,
  ): Promise<GreenhatBlogPostDTO> {
    return this.blogService.update(id, body, user!);
  }

  @Put('admin/:id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['ADMIN'])
  async publish(
    @Param('id') id: string,
    @Body() body: GreenhatBlogPostPublishDTO,
    @CurrentUser() user?: UserAuthBackendDTO,
  ): Promise<GreenhatBlogPostDTO> {
    return this.blogService.setPublished(id, body, user!);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['ADMIN'])
  async remove(
    @Param('id') id: string,
    @CurrentUser() user?: UserAuthBackendDTO,
  ): Promise<void> {
    return this.blogService.remove(id, user!);
  }


  @MessagePattern('file-upload-GREENHAT_BLOG')
  async bookInfoUploadInfo({ userId, objectId, roles }: FileUploadInfoRequest) {
    const name = objectId + '_' + new Date().toISOString(),
      category = 'GREENHAT_BLOG';
    // this.assertOwnership(name, userId, roles);

    return { category, name, maxLimitBytes: 2000000 };
  }


  @MessagePattern('file-volatility-GREENHAT_BLOG')
  async bookInfoVolatilityInfo({ userId, objectId, roles }: FileUploadInfoRequest) {
    return { success: true };
    const name = objectId + '_' + new Date().toISOString(),
      category = 'GREENHAT_BLOG';
    // this.assertOwnership(name, userId, roles);

    return { category, name, maxLimitBytes: 2000000 };
  }
}
