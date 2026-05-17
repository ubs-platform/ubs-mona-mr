import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatMessage, ChatMessageSchema } from './chat-message-model';
import { ChatSession, ChatSessionSchema } from './chat-session.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: ChatSession.name, schema: ChatSessionSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class SuperlamaEntityMongoModule {}
