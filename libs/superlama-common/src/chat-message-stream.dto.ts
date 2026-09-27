import { TextAssitantStage } from './text-assistant-stage';
import { ChatMessageSenderType } from './text-sender-type.dto';

export class ChatMessageStreamDTO {
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
    requestedLlmModel: string;
    streamMode: 'APPEND';
    assistantStartedAt: string;
    assistantFinishedAt: string;
    tokensPerSecond: number;
}
