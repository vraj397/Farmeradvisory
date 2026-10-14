import { Injectable, Logger } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../../../database/database.service';

export interface IAdminUser {
  userId: number;
  phoneNumber: string;
  role: string;
  createdAt: Date;
  name?: string;
  district?: string;
}

export interface IPlatformStats {
  totalFarmers: number;
  totalFarms: number;
  totalDiagnoses: number;
  totalReports: number;
  pendingEscalations: number;
}

@Injectable()
export class AdminRepository {
  private readonly logger = new Logger(AdminRepository.name);

  constructor(private readonly database: DatabaseService) {}

  async getAllUsers(
    role?: string,
    limit = 50,
    offset = 0,
  ): Promise<IAdminUser[]> {
    const users: IAdminUser[] = [];

    // Query farmers if role is 'farmer' or undefined
    if (!role || role === 'farmer') {
      const [farmerRows] = await this.database.getPool().execute<RowDataPacket[]>(
        `
          SELECT
            f.farmer_id     AS userId,
            f.phone_number  AS phoneNumber,
            'farmer'        AS role,
            f.created_at    AS createdAt,
            f.name          AS name,
            (SELECT d.district_name FROM farm_profiles fp JOIN districts d ON fp.district_id = d.district_id WHERE fp.farmer_id = f.farmer_id LIMIT 1) AS district
          FROM farmers f
          ORDER BY f.created_at DESC
          LIMIT ? OFFSET ?
        `,
        [limit, offset],
      );

      for (const row of farmerRows) {
        users.push({
          userId: Number(row.userId),
          phoneNumber: row.phoneNumber,
          role: row.role,
          createdAt: new Date(row.createdAt),
          name: row.name || 'Farmer',
          district: row.district || undefined,
        });
      }
    }

    // Query officers if role is 'field_officer' or 'admin' or undefined
    if (!role || role === 'field_officer' || role === 'admin') {
      const officerParams: any[] = [];
      let whereClause = '';
      if (role) {
        whereClause = 'WHERE o.role = ?';
        officerParams.push(role);
      }
      officerParams.push(limit, offset);

      const [officerRows] = await this.database.getPool().execute<RowDataPacket[]>(
        `
          SELECT
            o.officer_id    AS userId,
            o.phone_number  AS phoneNumber,
            o.role          AS role,
            o.created_at    AS createdAt,
            o.name          AS name,
            d.district_name AS district
          FROM officers o
          LEFT JOIN districts d ON o.district_id = d.district_id
          ${whereClause}
          ORDER BY o.created_at DESC
          LIMIT ? OFFSET ?
        `,
        officerParams,
      );

      for (const row of officerRows) {
        users.push({
          userId: Number(row.userId),
          phoneNumber: row.phoneNumber,
          role: row.role,
          createdAt: new Date(row.createdAt),
          name: row.name,
          district: row.district || undefined,
        });
      }
    }

    return users.slice(0, limit);
  }

  async getPlatformStats(): Promise<IPlatformStats> {
    try {
      const [rows] = await this.database.getPool().execute<RowDataPacket[]>(
        `
          SELECT
            (SELECT COUNT(*) FROM farmers)                               AS totalFarmers,
            (SELECT COUNT(*) FROM farm_profiles WHERE is_active = TRUE)   AS totalFarms,
            (SELECT COUNT(*) FROM advisory_queries)                      AS totalDiagnoses,
            (SELECT COUNT(*) FROM reports)                               AS totalReports,
            (SELECT COUNT(*) FROM escalations WHERE status = 'pending')  AS pendingEscalations
        `,
        [],
      );

      const r = (rows as RowDataPacket[])[0];
      return {
        totalFarmers: Number(r?.totalFarmers ?? 0),
        totalFarms: Number(r?.totalFarms ?? 0),
        totalDiagnoses: Number(r?.totalDiagnoses ?? 0),
        totalReports: Number(r?.totalReports ?? 0),
        pendingEscalations: Number(r?.pendingEscalations ?? 0),
      };
    } catch (err) {
      this.logger.error(`Error querying platform stats: ${(err as Error).message}`);
      return {
        totalFarmers: 0,
        totalFarms: 0,
        totalDiagnoses: 0,
        totalReports: 0,
        pendingEscalations: 0,
      };
    }
  }

  async updateUserRole(userId: number, newRole: string): Promise<void> {
    await this.database.getPool().execute(
      `UPDATE officers SET role = ? WHERE officer_id = ?`,
      [newRole, userId],
    );
    this.logger.log(`Updated role for officer ${userId} to ${newRole}`);
  }

  async deactivateUser(userId: number): Promise<void> {
    await this.database.getPool().execute(
      `UPDATE officers SET is_active = FALSE WHERE officer_id = ?`,
      [userId],
    );
    this.logger.warn(`Deactivated officer ${userId}`);
  }

  async getRecentAuditLogs(limit = 100): Promise<RowDataPacket[]> {
    try {
      const [rows] = await this.database.getPool().execute<RowDataPacket[]>(
        `
          SELECT
            id         AS auditId,
            user_id    AS userId,
            action     AS action,
            entity     AS entity,
            entity_id  AS entityId,
            ip_address AS ipAddress,
            created_at AS createdAt
          FROM audit_logs
          ORDER BY created_at DESC
          LIMIT ?
        `,
        [limit],
      );
      return rows;
    } catch {
      // Return empty if audit_logs table has not been initialized yet
      return [];
    }
  }
}
