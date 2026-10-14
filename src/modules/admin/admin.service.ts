import { Injectable, Logger } from '@nestjs/common';
import { AdminRepository, IPlatformStats, IAdminUser } from './repositories/admin.repository';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly adminRepo: AdminRepository) {}

  async getPlatformStats(): Promise<IPlatformStats> {
    this.logger.log('Fetching platform statistics');
    return this.adminRepo.getPlatformStats();
  }

  async listAllUsers(role?: string, limit = 50, offset = 0): Promise<IAdminUser[]> {
    return this.adminRepo.getAllUsers(role, limit, offset);
  }

  async updateUserRole(userId: number, newRole: string): Promise<{ success: boolean; message: string }> {
    const allowedRoles = ['farmer', 'field_officer', 'admin'];
    if (!allowedRoles.includes(newRole)) {
      return { success: false, message: `Invalid role. Allowed: ${allowedRoles.join(', ')}` };
    }

    await this.adminRepo.updateUserRole(userId, newRole);
    this.logger.log(`Admin updated user ${userId} role to ${newRole}`);
    return { success: true, message: `User ${userId} role updated to ${newRole}` };
  }

  async deactivateUser(userId: number): Promise<{ success: boolean; message: string }> {
    await this.adminRepo.deactivateUser(userId);
    this.logger.warn(`Admin deactivated user ${userId}`);
    return { success: true, message: `User ${userId} has been deactivated` };
  }

  async getAuditLogs(limit = 100) {
    return this.adminRepo.getRecentAuditLogs(limit);
  }
}
