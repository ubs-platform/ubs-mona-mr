import { Module } from '@nestjs/common';
import { MicroservicesCommonModule } from '@ubs-platform/microservice-setup-util';
import { GreenhatEntityMongoModule } from '@ubs-platform/greenhat-entity-mongo';
import { UserMicroserviceHelperModule } from '@ubs-platform/users-microservice-helper';
import { DocumentController } from './controller/document.controller';
import { ProjectController } from './controller/project.controller';
import { DocumentService } from './service/document.service';
import { ProjectService } from './service/project.service';

@Module({
  imports: [
    GreenhatEntityMongoModule,
    UserMicroserviceHelperModule,
    MicroservicesCommonModule,
  ],
  controllers: [ProjectController, DocumentController],
  providers: [ProjectService, DocumentService],
  exports: [ProjectService, DocumentService],
})
export class GreenhatWebserviceModule {}
