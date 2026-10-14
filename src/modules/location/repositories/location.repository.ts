import { Injectable, Logger } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../../../database/database.service';
import { IFarmerLocation, mapRowToLocation } from '../location.types';

@Injectable()
export class LocationRepository {
  private readonly logger = new Logger(LocationRepository.name);

  constructor(private readonly db: DatabaseService) {}

  async findActiveByFarmerId(farmerId: number): Promise<IFarmerLocation | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT * FROM farmer_locations WHERE farmer_id = ? AND is_active = TRUE ORDER BY created_at DESC LIMIT 1`,
      [farmerId],
    );
    if (!rows || rows.length === 0) return null;
    return mapRowToLocation(rows[0] as Record<string, unknown>);
  }

  async deactivateAll(farmerId: number): Promise<void> {
    await this.db.execute(
      `UPDATE farmer_locations SET is_active = FALSE WHERE farmer_id = ?`,
      [farmerId],
    );
  }

  async create(data: Partial<IFarmerLocation>): Promise<IFarmerLocation> {
    const result: ResultSetHeader = await this.db.execute(
      `INSERT INTO farmer_locations
        (farmer_id, latitude, longitude, accuracy, pincode, city, district, state, country, source, is_verified, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, TRUE)`,
      [
        data.farmerId,
        data.latitude ?? null,
        data.longitude ?? null,
        data.accuracy ?? null,
        data.pincode ?? null,
        data.city ?? null,
        data.district ?? null,
        data.state ?? null,
        data.country ?? 'India',
        data.source ?? 'pincode',
      ],
    );

    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT * FROM farmer_locations WHERE location_id = ?`,
      [result.insertId],
    );
    return mapRowToLocation(rows[0] as Record<string, unknown>);
  }
}
