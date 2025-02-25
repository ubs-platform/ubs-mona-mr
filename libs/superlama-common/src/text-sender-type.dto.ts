export const ChatMessageConsts = {
    SENDER_TYPE_USER: 'USER',
    SENDER_TYPE_ASSISTANT: 'ASSISTANT',
};

export type ChatMessageSenderType = keyof typeof ChatMessageConsts;

export interface ChatMessageDto {}
