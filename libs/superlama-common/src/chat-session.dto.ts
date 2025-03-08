import { TextAssitantStage } from './text-assistant-stage';
import { ChatMessageSenderType } from './text-sender-type.dto';

export interface ChatSessionDTO {
    _id: string;
    userParticipantsIds: string[];
    moderationNoteWarning: string;
    creationDate: Date;
    expirationDate: Date;
    subjectTitle: string;
    llmAnswerStatus: 'WAITING' | 'CONTINUING' | 'FINISHED';
}
