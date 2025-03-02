import { Injectable } from '@nestjs/common';
import { ChatMessage } from '../model/chat-message-model';
import { ChatMessageDTO } from '@ubs-platform/superlama-common';

@Injectable()
export class ChatMessageMapper {
    messageToDto(msgSaved: ChatMessage): ChatMessageDTO {
        return {
            _id: msgSaved._id,
            createdAt: msgSaved.createdAt.toISOString(),
            updatedAt: msgSaved.updatedAt.toISOString(),
            moderationNoteWarning: msgSaved.moderationNoteWarning,
            // can you continue from here?
            senderId: msgSaved.senderId,
            senderType: msgSaved.senderType,
            textContent: msgSaved.textContent,
            sessionId: msgSaved.sessionId,
            systemTextContent: msgSaved.systemTextContent,
            thoughtTextContent: msgSaved.thoughtTextContent,
            textAssistantStage: msgSaved.textAssistantStage,
        } as ChatMessageDTO;
    }
}
