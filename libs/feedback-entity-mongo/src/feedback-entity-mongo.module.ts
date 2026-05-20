import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserMessage, UserMessageSchema } from './user-message.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserMessage.name, schema: UserMessageSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class FeedbackEntityMongoModule {}
