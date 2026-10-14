import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppNotificationProvider } from '../../providers/notifications/whatsapp.provider';
import {
  NotificationChannel,
  NotificationsRepository,
  NotificationType,
} from './repositories/notifications.repository';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notificationsRepo: NotificationsRepository,
    private readonly whatsappProvider: WhatsAppNotificationProvider,
  ) {}

  /**
   * Send a notification to a farmer and record it in the notifications table.
   */
  async sendNotification(
    farmerId: number,
    channel: NotificationChannel,
    notificationType: NotificationType,
    title: string,
    message: string,
    relatedQueryId?: number,
  ) {
    const notifId = await this.notificationsRepo.create(
      farmerId,
      channel,
      notificationType,
      title,
      message,
      relatedQueryId,
    );

    this.logger.log(`Notification created [ID: ${notifId}] for Farmer [ID: ${farmerId}] via ${channel}`);
    return { notificationId: notifId, success: true };
  }

  /**
   * Send a WhatsApp PDF report message and record delivery in notifications.
   */
  async sendWhatsAppReport(
    farmerId: number,
    recipientPhone: string,
    pdfUrl: string,
    messageText?: string,
    queryId?: number,
  ): Promise<{ success: boolean; notificationId: number; messageId?: string }> {
    const title = 'Crop Advisory Report';
    const message = messageText || `Your advisory report is ready: ${pdfUrl}`;

    const notifId = await this.notificationsRepo.create(
      farmerId,
      'whatsapp',
      'report_ready',
      title,
      message,
      queryId,
    );

    try {
      const result = await this.whatsappProvider.sendPdfReport({
        recipientPhone,
        pdfUrl,
        messageText: message,
      });

      if (!result.success) {
        await this.notificationsRepo.updateStatus(notifId, 'failed');
      }

      this.logger.log(
        `WhatsApp report notification ${notifId} → farmer ${farmerId}: ${result.success ? 'SENT' : 'FAILED'}`,
      );

      return { success: result.success, notificationId: notifId, messageId: result.messageId };
    } catch (err) {
      await this.notificationsRepo.updateStatus(notifId, 'failed');
      this.logger.error(`WhatsApp send error for farmer ${farmerId}: ${(err as Error).message}`);
      return { success: false, notificationId: notifId };
    }
  }

  /**
   * Get notification history for a farmer.
   */
  async getFarmerNotifications(farmerId: number, limit = 50) {
    return this.notificationsRepo.findByFarmer(farmerId, limit);
  }

  /**
   * Mark a notification as read.
   */
  async markAsRead(notificationId: number, farmerId: number) {
    const success = await this.notificationsRepo.markAsRead(notificationId, farmerId);
    return { success };
  }
}
