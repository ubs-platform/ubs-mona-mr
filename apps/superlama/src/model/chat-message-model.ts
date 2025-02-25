import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
    ChatMessageConsts,
    ChatMessageSenderType,
} from '@ubs-platform/superlama-common';

@Schema()
export class ChatMessage {
    _id: String;
    @Prop({ type: Date }) createdAt: Date;
    @Prop({ type: Date }) updatedAt: Date;
    @Prop({ type: String }) textContent: String;
    @Prop({ type: String }) systemTextContent: String;
    @Prop({ type: String }) senderType: ChatMessageSenderType;
    @Prop({ type: String }) senderId: String;
    @Prop({ type: String }) sessionId: String;
    @Prop({ type: String }) moderationNoteWarning: String;
}
export type ChatMessageDoc = ChatMessage & Document;
export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
