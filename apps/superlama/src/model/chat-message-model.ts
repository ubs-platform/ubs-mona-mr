import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
    ChatMessageSenderType,
    TextAssitantStage,
} from '@ubs-platform/superlama-common';

@Schema()
export class ChatMessage {
    _id: String;
    @Prop({ type: Date }) createdAt: Date;
    @Prop({ type: Date }) updatedAt: Date;
    @Prop({ type: String }) textContent: string;
    @Prop({ type: String }) thoughtTextContent: string;
    @Prop({ type: String }) textAssistantStage: TextAssitantStage;
    @Prop({ type: String }) systemTextContent: string;
    @Prop({ type: String }) senderType: ChatMessageSenderType;
    @Prop({ type: String }) senderId: string;
    @Prop({ type: String }) sessionId: string;
    @Prop({ type: String }) moderationNoteWarning: string;
}
export type ChatMessageDoc = ChatMessage & Document;
export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
