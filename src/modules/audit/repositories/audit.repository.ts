import { Injectable, Logger } from '@nestjs/common';
import { ResultSetHeader } from 'mysql2/promise';
import { DatabaseService } from '../../../database/database.service';

export interface IAuditLogEntry {
  userId: number;
  action: string;
  entity: string;
  entityId?: number;
  meta?: Record<string, any>;
  ipAddress?: string;
}

@Injectable()
export class AuditRepository {
  private readonly logger = new Logger(AuditRepository.name);

  constructor(private readonly database: DatabaseService) {}

  /**
   * Log an action performed by a user.
   * Silently catches errors to prevent audit failures from disrupting main flow.
   */
  async log(entry: IAuditLogEntry): Promise<void> {
    try {
      await this.database.execute(
        `
          INSERT INTO audit_logs
            (user_id, action, entity, entity_id, meta, ip_address, created_at)
          VALUES
            (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
        [
          entry.userId,
          entry.action,
          entry.entity,
          entry.entityId ?? null,
          entry.meta ? JSON.stringify(entry.meta) : null,
          entry.ipAddress ?? null,
        ],
      );
    } catch (err) {
      // Non-blocking — log to console but don't throw
      this.logger.warn(
        `Audit log insert failed (non-critical): ${(err as Error).message}`,
      );
    }
  }
}
