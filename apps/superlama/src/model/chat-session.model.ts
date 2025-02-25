import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class ChatSession {
    _id: String;
    @Prop({ type: [String] })
    userParticipantsIds: String[];
    @Prop({ type: String }) senderId: String;
    @Prop({ type: String }) sessionId: String;
    @Prop({ type: String }) moderationNoteWarning: String;
    @Prop({ type: Date, default: new Date(Date.now() + 2629746000) })
    expirationDate: Date;
}
export type ChatSessionDoc = ChatSession & Document;
export const ChatSessionSchema = SchemaFactory.createForClass(ChatSession);
