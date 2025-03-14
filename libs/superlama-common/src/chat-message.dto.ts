import { TextAssitantStage } from './text-assistant-stage';
import { ChatMessageSenderType } from './text-sender-type.dto';

export interface ChatMessageDTO {
    _id: string;
    createdAt: string;
    updatedAt: string;
    textContent: string;
    requestedLlmModel: string;
    thoughtTextContent: string;
    systemTextContent: string;
    senderType: ChatMessageSenderType;
    textAssistantStage: TextAssitantStage;
    senderId: string;
    sessionId: string;
    moderationNoteWarning: string;
    assistantStartedAt: string;
    assistantFinishedAt: string;
    tokensPerSecond: number;
}
