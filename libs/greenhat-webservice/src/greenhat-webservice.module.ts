import { Module } from '@nestjs/common';
import { MicroservicesCommonModule } from '@ubs-platform/microservice-setup-util';
import { GreenhatEntityMongoModule } from '@ubs-platform/greenhat-entity-mongo';
import { UserMicroserviceHelperModule } from '@ubs-platform/users-microservice-helper';
import { DocumentController } from './controller/document.controller';
import { ProjectController } from './controller/project.controller';
import { BlogController } from './controller/blog.controller';
import { BlogService } from './service/blog.service';
import { DocumentService } from './service/document.service';
import { ProjectService } from './service/project.service';

@Module({
    imports: [
        UserMicroserviceHelperModule,
        GreenhatEntityMongoModule,
        UserMicroserviceHelperModule,
        MicroservicesCommonModule,
    ],
    controllers: [ProjectController, DocumentController, BlogController],
    providers: [ProjectService, DocumentService, BlogService],
    exports: [ProjectService, DocumentService, BlogService],
})
export class GreenhatWebserviceModule { }
