import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { DatabaseService } from '../../../database/database.service';
import { IAiConversation, IAiMessage } from '../ai-chat.types';

@Injectable()
export class AiChatRepository {
  private readonly logger = new Logger(AiChatRepository.name);

  constructor(private readonly database: DatabaseService) {}

  async findConversations(farmerId: number): Promise<IAiConversation[]> {
    try {
      const rows = await this.database.query<RowDataPacket[]>(
        `
          SELECT
            conversation_id AS conversationId,
            farmer_id       AS farmerId,
            title           AS title,
            created_at      AS createdAt,
            updated_at      AS updatedAt
          FROM ai_conversations
          WHERE farmer_id = ?
          ORDER BY updated_at DESC
          LIMIT 20
        `,
        [farmerId],
      );

      return rows.map((r: any) => ({
        conversationId: r.conversationId,
        farmerId: Number(r.farmerId),
        title: r.title,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      }));
    } catch {
      return [];
    }
  }

  async createConversation(conversationId: string, farmerId: number, title: string): Promise<void> {
    try {
      await this.database.execute(
        `
          INSERT INTO ai_conversations (conversation_id, farmer_id, title)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
        `,
        [conversationId, farmerId, title],
      );
    } catch (err) {
      this.logger.warn(`Could not persist ai_conversation: ${(err as Error).message}`);
    }
  }

  async addMessage(
    conversationId: string,
    farmerId: number,
    role: 'user' | 'assistant' | 'system',
    message: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      await this.database.execute(
        `
          INSERT INTO ai_messages (conversation_id, farmer_id, role, message, metadata)
          VALUES (?, ?, ?, ?, ?)
        `,
        [
          conversationId,
          farmerId,
          role,
          message,
          metadata ? JSON.stringify(metadata) : null,
        ],
      );
    } catch (err) {
      this.logger.warn(`Could not persist ai_message: ${(err as Error).message}`);
    }
  }

  async getMessages(conversationId: string, farmerId: number): Promise<IAiMessage[]> {
    try {
      const rows = await this.database.query<RowDataPacket[]>(
        `
          SELECT
            message_id      AS messageId,
            conversation_id AS conversationId,
            farmer_id       AS farmerId,
            role            AS role,
            message         AS message,
            metadata        AS metadata,
            created_at      AS createdAt
          FROM ai_messages
          WHERE conversation_id = ? AND farmer_id = ?
          ORDER BY created_at ASC
          LIMIT 100
        `,
        [conversationId, farmerId],
      );

      return rows.map((r: any) => ({
        messageId: Number(r.messageId),
        conversationId: r.conversationId,
        farmerId: Number(r.farmerId),
        role: r.role,
        message: r.message,
        metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
        createdAt: new Date(r.createdAt),
      }));
    } catch {
      return [];
    }
  }
}
