import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import {
    E5NestClient,
    Engine5Connection,
    MicroserviceSetupUtil,
} from '@ubs-platform/microservice-setup-util';
import { BackendJwtUtilsModule } from '@ubs-platform/users-microservice-helper';
import { join } from 'path';
import { FileModel, FileSchema } from './model/file.schema';
import { ImageFileController } from './controller/file.controller';
import { FileService } from './service/file.service';
import {
    EntityProperty,
    EntityPropertySchema,
} from './model/entity-property.schema';
import { EntityPropertyService } from './service/entity-property.service';
import { EntityPropertyController } from './controller/entity-property.controller';
import { ScheduleModule } from '@nestjs/schedule';
import { Connection } from 'mongoose';
import { randomUUID } from 'crypto';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        MongooseModule.forRoot(
            `mongodb://${process.env.NX_MONGO_USERNAME}:${process.env.NX_MONGO_PASSWORD
            }@${process.env.NX_MONGO_URL || 'localhost'}/?authMechanism=DEFAULT`,
            {
                dbName: process.env.NX_MONGO_DBNAME || 'ubs_files',
            },
        ),
        ServeStaticModule.forRoot({
            rootPath: join(__dirname, '..', 'assets'),
        }),
        MongooseModule.forFeature([
            { name: FileModel.name, schema: FileSchema },
            { name: EntityProperty.name, schema: EntityPropertySchema },
        ]),
        ClientsModule.register([MicroserviceSetupUtil.setupClient("", "KafkaClient")]),

        BackendJwtUtilsModule,
    ],
    controllers: [ImageFileController, EntityPropertyController],
    providers: [FileService, EntityPropertyService],
})
export class AppModule { }
