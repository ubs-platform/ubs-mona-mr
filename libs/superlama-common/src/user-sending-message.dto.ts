export interface UserSendingMessageDto {
    newSession: boolean;
    sessionId?: string;
    message: string;
    selectedLlm: string;
}
