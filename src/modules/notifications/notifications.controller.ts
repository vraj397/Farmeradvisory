import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, IAuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import {
  NotificationChannel,
  NotificationType,
} from './repositories/notifications.repository';

class SendNotificationDto {
  channel: NotificationChannel;
  notificationType: NotificationType;
  title: string;
  message: string;
  relatedQueryId?: number;
}

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notification inbox for authenticated farmer' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved' })
  async getNotifications(
    @CurrentUser() user: IAuthUser,
    @Query('limit') limit?: string,
  ) {
    const lim = limit ? parseInt(limit, 10) : 50;
    return this.notificationsService.getFarmerNotifications(user.userId, lim);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markRead(
    @CurrentUser() user: IAuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationsService.markAsRead(id, user.userId);
  }

  @Post('send')
  @ApiOperation({ summary: 'Send a notification to a farmer' })
  @ApiResponse({ status: 201, description: 'Notification sent and logged' })
  async sendNotification(
    @CurrentUser() user: IAuthUser,
    @Body() dto: SendNotificationDto,
  ) {
    return this.notificationsService.sendNotification(
      user.userId,
      dto.channel,
      dto.notificationType,
      dto.title,
      dto.message,
      dto.relatedQueryId,
    );
  }
}
