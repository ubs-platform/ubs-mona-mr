import { TextAssitantStage } from './text-assistant-stage';
import { ChatMessageSenderType } from './text-sender-type.dto';

export interface ChatMessageStreamDTO {
    _id: string;
    createdAt: string;
    updatedAt: string;
    textContent: string;
    thoughtTextContent: string;
    systemTextContent: string;
    senderType: ChatMessageSenderType;
    textAssistantStage: TextAssitantStage;
    senderId: string;
    sessionId: string;
    moderationNoteWarning: string;
    streamMode: 'APPEND';
    complete: boolean;
}
