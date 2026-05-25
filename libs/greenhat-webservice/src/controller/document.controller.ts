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
import {
  GreenhatDocumentAddDTO,
  GreenhatDocumentContentPutDTO,
  GreenhatDocumentDTO,
  GreenhatDocumentListDTO,
  GreenhatDocumentRemovePreviewDTO,
  GreenhatDocumentRemoveResultDTO,
  GreenhatDocumentRenameDTO,
} from '@ubs-platform/greenhat-common';
import { UserAuthBackendDTO } from '@ubs-platform/users-common';
import { DocumentService } from '../service/document.service';

@Controller('greenhat/document')
@UseGuards(JwtAuthGuard)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get()
  async list(
    @Query() query: GreenhatDocumentListDTO,
    @CurrentUser() user?: UserAuthBackendDTO,
  ): Promise<GreenhatDocumentDTO[]> {
    return this.documentService.listDocuments(query, user!);
  }

  @Post('add')
  async add(
    @Body() body: GreenhatDocumentAddDTO,
    @CurrentUser() user?: UserAuthBackendDTO,
  ): Promise<GreenhatDocumentDTO> {
    return this.documentService.addDocument(body, user!);
  }

  @Post('rename')
  async rename(
    @Body() body: GreenhatDocumentRenameDTO,
    @CurrentUser() user?: UserAuthBackendDTO,
  ): Promise<GreenhatDocumentDTO> {
    return this.documentService.renameDocument(body, user!);
  }

  @Delete(':id')
  async remove(
    @Param() { id }: { id: string },
    @CurrentUser() user?: UserAuthBackendDTO,
  ): Promise<GreenhatDocumentRemoveResultDTO> {
    return this.documentService.removeDocumentRecursive(id, user!);
  }

  @Get(':id/remove-preview')
  async removePreview(
    @Param() { id }: { id: string },
    @CurrentUser() user?: UserAuthBackendDTO,
  ): Promise<GreenhatDocumentRemovePreviewDTO> {
    return this.documentService.previewRecursiveRemove(id, user!);
  }

  @Put(':id/content')
  async putContent(
    @Param() { id }: { id: string },
    @Body() body: GreenhatDocumentContentPutDTO,
    @CurrentUser() user?: UserAuthBackendDTO,
  ): Promise<GreenhatDocumentDTO> {
    return this.documentService.putDocumentContent(id, body, user!);
  }
}
