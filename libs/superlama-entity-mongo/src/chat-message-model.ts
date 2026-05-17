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
    @Prop({ type: Date }) assistantStartedAt: Date;
    @Prop({ type: Date }) assistantFinishedAt: Date;
    @Prop({ type: Number }) tokensPerSecond: number;
    @Prop({ type: String }) textContent: string;
    @Prop({ type: String }) requestedLlmModel: string;
    @Prop({ type: String }) thoughtTextContent: string;
    @Prop({ type: String }) textAssistantStage: TextAssitantStage;
    @Prop({ type: String }) systemTextContent: string;
    @Prop({ type: String }) senderType: ChatMessageSenderType;
    @Prop({ type: String }) senderId: string;
    @Prop({ type: String }) sessionId: string;
    @Prop({ type: String }) moderationNoteWarning: string;
    // @Prop({ type: String }) userMessageAnswerStatus:
    //     | 'WAITING'
    //     | 'WORKING'
    //     | 'FINISHED';
    // @Prop({ type: String }) assistantTargetMessageId: string;
}
export type ChatMessageDoc = ChatMessage & Document;
export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
