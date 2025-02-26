import { ChatMessageSenderType } from './text-sender-type.dto';

export interface ChatMessageDTO {
    _id: string;
    createdAt: string;
    updatedAt: string;
    textContent: string;
    systemTextContent: string;
    senderType: ChatMessageSenderType;
    senderId: string;
    sessionId: string;
    moderationNoteWarning: string;
}
