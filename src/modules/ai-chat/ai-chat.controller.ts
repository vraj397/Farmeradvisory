import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, IAuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AiChatService } from './ai-chat.service';

class SendChatMessageDto {
  conversationId?: string;
  message: string;
  language?: 'en' | 'gu' | 'hi';
}

@ApiTags('Krishi AI Assistant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai-chat')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get list of AI conversation threads for authenticated farmer' })
  @ApiResponse({ status: 200, description: 'Conversations list retrieved' })
  async getConversations(@CurrentUser() user: IAuthUser) {
    return this.aiChatService.getConversations(user.userId);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get message history of a specific AI conversation' })
  @ApiResponse({ status: 200, description: 'Messages list retrieved' })
  async getMessages(
    @CurrentUser() user: IAuthUser,
    @Param('id') id: string,
  ) {
    return this.aiChatService.getMessages(id, user.userId);
  }

  @Post('message')
  @ApiOperation({ summary: 'Send question to Krishi AI and receive agronomic guidance' })
  @ApiResponse({ status: 200, description: 'AI guidance response returned' })
  async sendMessage(
    @CurrentUser() user: IAuthUser,
    @Body() dto: SendChatMessageDto,
  ) {
    return this.aiChatService.processMessage(
      user.userId,
      dto.message,
      dto.conversationId,
      dto.language || 'en',
    );
  }
}
