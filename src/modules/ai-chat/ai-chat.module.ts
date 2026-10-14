import { Module } from '@nestjs/common';
import { AiChatController } from './ai-chat.controller';
import { AiChatRepository } from './repositories/ai-chat.repository';
import { AiChatService } from './ai-chat.service';

@Module({
  controllers: [AiChatController],
  providers: [AiChatService, AiChatRepository],
  exports: [AiChatService, AiChatRepository],
})
export class AiChatModule {}
