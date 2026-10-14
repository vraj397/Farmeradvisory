import { Module } from '@nestjs/common';
import { WhatsAppNotificationProvider } from '../../providers/notifications/whatsapp.provider';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './repositories/notifications.repository';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    WhatsAppNotificationProvider,
  ],
  exports: [NotificationsService, NotificationsRepository],
})
export class NotificationsModule {}
