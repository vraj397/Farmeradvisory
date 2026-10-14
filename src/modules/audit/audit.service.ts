import { Injectable } from '@nestjs/common';
import { AuditRepository, IAuditLogEntry } from './repositories/audit.repository';

@Injectable()
export class AuditService {
  constructor(private readonly auditRepo: AuditRepository) {}

  /**
   * Log a user action. Called from other services to record auditable events.
   * Example: login, profile update, crop upload, PDF generation.
   */
  async log(entry: IAuditLogEntry): Promise<void> {
    return this.auditRepo.log(entry);
  }

  // Convenience helpers
  async logLogin(userId: number, ipAddress?: string): Promise<void> {
    return this.log({ userId, action: 'LOGIN', entity: 'users', entityId: userId, ipAddress });
  }

  async logProfileUpdate(userId: number, meta?: Record<string, any>): Promise<void> {
    return this.log({ userId, action: 'UPDATE_PROFILE', entity: 'farmer_profiles', entityId: userId, meta });
  }

  async logDiagnosisUpload(userId: number, queryId: number, ipAddress?: string): Promise<void> {
    return this.log({
      userId,
      action: 'DIAGNOSIS_UPLOAD',
      entity: 'advisory_queries',
      entityId: queryId,
      ipAddress,
    });
  }

  async logReportGeneration(userId: number, reportId: number): Promise<void> {
    return this.log({ userId, action: 'GENERATE_REPORT', entity: 'reports', entityId: reportId });
  }

  async logEscalation(userId: number, escalationId: number): Promise<void> {
    return this.log({ userId, action: 'CREATE_ESCALATION', entity: 'expert_escalations', entityId: escalationId });
  }

  async logAdminAction(adminId: number, action: string, targetUserId?: number): Promise<void> {
    return this.log({
      userId: adminId,
      action,
      entity: 'users',
      entityId: targetUserId,
      meta: { targetUser: targetUserId },
    });
  }
}
