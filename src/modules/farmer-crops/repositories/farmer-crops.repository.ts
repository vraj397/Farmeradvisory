import { Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../../../database/database.service';
import { IFarmerCrop, mapRowToFarmerCrop } from '../farmer-crops.types';

@Injectable()
export class FarmerCropsRepository {
  constructor(private readonly db: DatabaseService) {}

  async findAllByFarmer(farmerId: number): Promise<IFarmerCrop[]> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT * FROM farmer_crops WHERE farmer_id = ? ORDER BY created_at DESC`,
      [farmerId],
    );
    return (rows || []).map((r) => mapRowToFarmerCrop(r as Record<string, unknown>));
  }

  async findByIdAndFarmer(farmerCropId: number, farmerId: number): Promise<IFarmerCrop | null> {
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT * FROM farmer_crops WHERE farmer_crop_id = ? AND farmer_id = ? LIMIT 1`,
      [farmerCropId, farmerId],
    );
    if (!rows || rows.length === 0) return null;
    return mapRowToFarmerCrop(rows[0] as Record<string, unknown>);
  }

  async create(farmerId: number, data: Partial<IFarmerCrop>): Promise<IFarmerCrop> {
    const result: ResultSetHeader = await this.db.execute(
      `INSERT INTO farmer_crops
        (farmer_id, crop_id, crop_name, variety, area, sowing_date, expected_harvest_date, current_stage, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        farmerId,
        data.cropId ?? null,
        data.cropName,
        data.variety ?? null,
        data.area ?? 1,
        data.sowingDate ?? null,
        data.expectedHarvestDate ?? null,
        data.currentStage ?? 'vegetative',
        data.status ?? 'active',
        data.notes ?? null,
      ],
    );
    const rows = await this.db.query<RowDataPacket[]>(
      `SELECT * FROM farmer_crops WHERE farmer_crop_id = ?`,
      [result.insertId],
    );
    return mapRowToFarmerCrop(rows[0] as Record<string, unknown>);
  }

  async update(farmerCropId: number, farmerId: number, data: Partial<IFarmerCrop>): Promise<IFarmerCrop | null> {
    await this.db.execute(
      `UPDATE farmer_crops SET
        variety = COALESCE(?, variety),
        area = COALESCE(?, area),
        sowing_date = COALESCE(?, sowing_date),
        expected_harvest_date = COALESCE(?, expected_harvest_date),
        current_stage = COALESCE(?, current_stage),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
       WHERE farmer_crop_id = ? AND farmer_id = ?`,
      [
        data.variety ?? null,
        data.area ?? null,
        data.sowingDate ?? null,
        data.expectedHarvestDate ?? null,
        data.currentStage ?? null,
        data.status ?? null,
        data.notes ?? null,
        farmerCropId,
        farmerId,
      ],
    );
    return this.findByIdAndFarmer(farmerCropId, farmerId);
  }

  async softDelete(farmerCropId: number, farmerId: number): Promise<void> {
    await this.db.execute(
      `UPDATE farmer_crops SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE farmer_crop_id = ? AND farmer_id = ?`,
      [farmerCropId, farmerId],
    );
  }
}
