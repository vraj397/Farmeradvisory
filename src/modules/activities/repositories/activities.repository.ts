import { Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../../../database/database.service';
import { ICropActivity, mapRowToActivity } from '../activities.types';

@Injectable()
export class ActivitiesRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByFarmer(farmerId: number, limit = 50): Promise<ICropActivity[]> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT * FROM crop_activities WHERE farmer_id = ? ORDER BY activity_date DESC LIMIT ?`,
      [farmerId, limit],
    );
    return (rows || []).map((r) => mapRowToActivity(r as Record<string, unknown>));
  }

  async findByIdAndFarmer(activityId: number, farmerId: number): Promise<ICropActivity | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT * FROM crop_activities WHERE activity_id = ? AND farmer_id = ? LIMIT 1`,
      [activityId, farmerId],
    );
    if (!rows || rows.length === 0) return null;
    return mapRowToActivity(rows[0] as Record<string, unknown>);
  }

  async create(farmerId: number, data: Partial<ICropActivity>): Promise<ICropActivity> {
    const result: ResultSetHeader = await this.db.execute(
      `INSERT INTO crop_activities (farmer_id, farmer_crop_id, activity_type, title, description, activity_date, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        farmerId,
        data.farmerCropId ?? null,
        data.activityType,
        data.title,
        data.description ?? null,
        data.activityDate ? new Date(data.activityDate as unknown as string) : new Date(),
        data.metadata ? JSON.stringify(data.metadata) : null,
      ],
    );
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT * FROM crop_activities WHERE activity_id = ?`,
      [result.insertId],
    );
    return mapRowToActivity(rows[0] as Record<string, unknown>);
  }

  async update(activityId: number, farmerId: number, data: Partial<ICropActivity>): Promise<ICropActivity | null> {
    await this.db.execute(
      `UPDATE crop_activities SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        activity_date = COALESCE(?, activity_date),
        metadata = COALESCE(?, metadata)
       WHERE activity_id = ? AND farmer_id = ?`,
      [
        data.title ?? null,
        data.description ?? null,
        data.activityDate ? new Date(data.activityDate as unknown as string) : null,
        data.metadata ? JSON.stringify(data.metadata) : null,
        activityId,
        farmerId,
      ],
    );
    return this.findByIdAndFarmer(activityId, farmerId);
  }

  async delete(activityId: number, farmerId: number): Promise<void> {
    await this.db.execute(
      `DELETE FROM crop_activities WHERE activity_id = ? AND farmer_id = ?`,
      [activityId, farmerId],
    );
  }

  async findRecentByFarmer(farmerId: number, days = 7): Promise<ICropActivity[]> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT * FROM crop_activities
       WHERE farmer_id = ? AND activity_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
       ORDER BY activity_date DESC`,
      [farmerId, days],
    );
    return (rows || []).map((r) => mapRowToActivity(r as Record<string, unknown>));
  }
}
