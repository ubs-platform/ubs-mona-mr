export class NotificationDto {
    message: string;
    recipientUserId: string;
    isNonCritical?: boolean;
    navigationLink?: string;
    language?: string;
    distributionSentAt?: Date | null;
}