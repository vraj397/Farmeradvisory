export type ActivityType =
  | 'sowing'
  | 'irrigation'
  | 'fertilizer'
  | 'pesticide'
  | 'weeding'
  | 'pest_observation'
  | 'disease_observation'
  | 'rainfall'
  | 'harvesting'
  | 'inspection'
  | 'custom';

export interface ICropActivity {
  activityId: number;
  farmerId: number;
  farmerCropId: number | null;
  activityType: ActivityType;
  title: string;
  description: string | null;
  activityDate: Date;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export function mapRowToActivity(row: Record<string, unknown>): ICropActivity {
  let metadata: Record<string, unknown> | null = null;
  if (row['metadata']) {
    try {
      metadata = typeof row['metadata'] === 'string' ? JSON.parse(row['metadata'] as string) : row['metadata'] as Record<string, unknown>;
    } catch {
      metadata = null;
    }
  }
  return {
    activityId: Number(row['activity_id']),
    farmerId: Number(row['farmer_id']),
    farmerCropId: row['farmer_crop_id'] != null ? Number(row['farmer_crop_id']) : null,
    activityType: row['activity_type'] as ActivityType,
    title: row['title'] as string,
    description: (row['description'] as string) || null,
    activityDate: new Date(row['activity_date'] as string),
    metadata,
    createdAt: new Date(row['created_at'] as string),
  };
}
