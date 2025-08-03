import { Module } from '@nestjs/common';

import { BackendJwtUtilsModule } from '@ubs-platform/users-microservice-helper';
import { Mongoose } from 'mongoose';
import { MongooseModule } from '@nestjs/mongoose';

import { UserMessage, UserMessageSchema } from './model/user-message.model';
import { UserMessageService } from './service/user-message.service';
import { UserMessageController } from './controller/user-messages.controller';
import { EmailService } from './service/email.service';
import { ClientsModule } from '@nestjs/microservices';
import { E5NestClient, MicroserviceSetupUtil } from '@ubs-platform/microservice-setup-util';

@Module({
    imports: [
        BackendJwtUtilsModule,

        ClientsModule.register([MicroserviceSetupUtil.setupClient("", "KAFKA_CLIENT")]),

        MongooseModule.forRoot(
            `mongodb://${process.env.NX_MONGO_USERNAME}:${process.env.NX_MONGO_PASSWORD
            }@${process.env.NX_MONGO_URL || 'localhost'}/?authMechanism=DEFAULT`,
            {
                dbName: process.env.NX_MONGO_DBNAME || 'ubs_users',
            },
        ),
        MongooseModule.forFeature([
            { name: UserMessage.name, schema: UserMessageSchema },
        ]),
    ],
    controllers: [UserMessageController],
    providers: [UserMessageService, EmailService],
})
export class AppModule { }
