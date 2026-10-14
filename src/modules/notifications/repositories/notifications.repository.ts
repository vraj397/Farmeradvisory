import { Injectable, Logger } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../../../database/database.service';

export type NotificationChannel = 'push' | 'sms' | 'whatsapp';
export type NotificationType =
  | 'weather_alert'
  | 'outbreak_alert'
  | 'broadcast'
  | 'report_ready'
  | 'escalation_update';
export type NotificationStatus = 'sent' | 'delivered' | 'failed' | 'read';

export interface INotificationRecord {
  notificationId: number;
  farmerId: number;
  channel: NotificationChannel;
  notificationType: NotificationType;
  title: string;
  message: string;
  relatedQueryId?: number | null;
  status: NotificationStatus;
  sentAt: Date;
  readAt?: Date | null;
}

@Injectable()
export class NotificationsRepository {
  private readonly logger = new Logger(NotificationsRepository.name);

  constructor(private readonly database: DatabaseService) {}

  async create(
    farmerId: number,
    channel: NotificationChannel,
    notificationType: NotificationType,
    title: string,
    message: string,
    relatedQueryId?: number,
  ): Promise<number> {
    const result = await this.database.execute(
      `
        INSERT INTO notifications
          (farmer_id, channel, notification_type, title, message, related_query_id, status, sent_at)
        VALUES
          (?, ?, ?, ?, ?, ?, 'sent', CURRENT_TIMESTAMP)
      `,
      [farmerId, channel, notificationType, title, message, relatedQueryId ?? null],
    );
    return result.insertId;
  }

  async updateStatus(
    notificationId: number,
    status: NotificationStatus,
  ): Promise<void> {
    await this.database.execute(
      `
        UPDATE notifications
        SET
          status = ?,
          read_at = CASE WHEN ? = 'read' THEN CURRENT_TIMESTAMP ELSE read_at END
        WHERE notification_id = ?
      `,
      [status, status, notificationId],
    );
  }

  async markAsRead(notificationId: number, farmerId: number): Promise<boolean> {
    const result = await this.database.execute(
      `
        UPDATE notifications
        SET status = 'read', read_at = CURRENT_TIMESTAMP
        WHERE notification_id = ? AND farmer_id = ?
      `,
      [notificationId, farmerId],
    );
    return result.affectedRows > 0;
  }

  async findByFarmer(farmerId: number, limit = 50): Promise<INotificationRecord[]> {
    const rows = await this.database.query<RowDataPacket[]>(
      `
        SELECT
          notification_id      AS notificationId,
          farmer_id            AS farmerId,
          channel              AS channel,
          notification_type    AS notificationType,
          title                AS title,
          message              AS message,
          related_query_id     AS relatedQueryId,
          status               AS status,
          sent_at              AS sentAt,
          read_at              AS readAt
        FROM notifications
        WHERE farmer_id = ?
        ORDER BY sent_at DESC
        LIMIT ?
      `,
      [farmerId, limit],
    );
    return rows as INotificationRecord[];
  }
}
