import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { UserMicroserviceHelperModule } from '@ubs-platform/users-microservice-helper';
import { MicroservicesCommonModule } from '@ubs-platform/microservice-setup-util';
import { FilesEntityMongoModule } from '@ubs-platform/files-entity-mongo';
import { CacheManagerModule } from '@ubs-platform/cache-manager';
import { join } from 'path';
import { ImageFileController } from './controller/file.controller';
import { EntityPropertyController } from './controller/entity-property.controller';
import { FileService } from './service/file.service';
import { EntityPropertyService } from './service/entity-property.service';

@Module({
  imports: [
    FilesEntityMongoModule,
    ScheduleModule,
    UserMicroserviceHelperModule,
    CacheManagerModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'assets'),
    }),
    MicroservicesCommonModule

  ],
  controllers: [ImageFileController, EntityPropertyController],
  providers: [FileService, EntityPropertyService],
  exports: [FileService, EntityPropertyService],
})
export class FilesWebserviceModule { }
