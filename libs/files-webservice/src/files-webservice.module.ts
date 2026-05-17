import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { BackendJwtUtilsModule } from '@ubs-platform/users-microservice-helper';
import { MicroserviceSetupUtil } from '@ubs-platform/microservice-setup-util';
import { FilesEntityMongoModule } from '@ubs-platform/files-entity-mongo';
import { join } from 'path';
import { ImageFileController } from './controller/file.controller';
import { EntityPropertyController } from './controller/entity-property.controller';
import { FileService } from './service/file.service';
import { EntityPropertyService } from './service/entity-property.service';

@Module({
  imports: [
    FilesEntityMongoModule,
    ScheduleModule,
    BackendJwtUtilsModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'assets'),
    }),
    ClientsModule.register([MicroserviceSetupUtil.setupClient('', 'KafkaClient')]),
  ],
  controllers: [ImageFileController, EntityPropertyController],
  providers: [FileService, EntityPropertyService],
  exports: [FileService, EntityPropertyService],
})
export class FilesWebserviceModule {}
