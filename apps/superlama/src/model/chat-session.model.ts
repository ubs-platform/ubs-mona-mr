import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
@Schema()
export class ChatSession {
    _id: string;
    @Prop({ type: [String] })
    userParticipantsIds: string[];
    @Prop({ type: String }) moderationNoteWarning: string;
    @Prop({ type: String })
    subjectTitle: string;
    @Prop({ type: Date, default: new Date(Date.now()) })
    creationDate: Date;
    @Prop({ type: Date, default: new Date(Date.now() + 2629746000) })
    expirationDate: Date;
    @Prop({ type: String }) llmAnswerStatus:
        | 'WAITING'
        | 'CONTINUING'
        | 'FINISHED' = 'WAITING';
}
export type ChatSessionDoc = ChatSession & Document;
export const ChatSessionSchema = SchemaFactory.createForClass(ChatSession);
