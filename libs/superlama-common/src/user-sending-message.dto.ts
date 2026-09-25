export class UserSendingMessageDto {
    newSession: boolean;
    sessionId?: string;
    message: string;
    selectedLlm: string;
}
