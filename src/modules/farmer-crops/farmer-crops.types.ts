export type CropStage = 'sowing' | 'vegetative' | 'flowering' | 'fruiting' | 'harvesting' | 'post_harvest';
export type CropStatus = 'active' | 'harvested' | 'archived';

export interface IFarmerCrop {
  farmerCropId: number;
  farmerId: number;
  cropId: number | null;
  cropName: string;
  variety: string | null;
  area: number;
  sowingDate: string | null;
  expectedHarvestDate: string | null;
  currentStage: CropStage;
  status: CropStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function mapRowToFarmerCrop(row: Record<string, unknown>): IFarmerCrop {
  return {
    farmerCropId: Number(row['farmer_crop_id']),
    farmerId: Number(row['farmer_id']),
    cropId: row['crop_id'] != null ? Number(row['crop_id']) : null,
    cropName: row['crop_name'] as string,
    variety: (row['variety'] as string) || null,
    area: Number(row['area']),
    sowingDate: row['sowing_date'] ? String(row['sowing_date']).split('T')[0] : null,
    expectedHarvestDate: row['expected_harvest_date'] ? String(row['expected_harvest_date']).split('T')[0] : null,
    currentStage: (row['current_stage'] as CropStage) || 'vegetative',
    status: (row['status'] as CropStatus) || 'active',
    notes: (row['notes'] as string) || null,
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}
