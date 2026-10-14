export interface IFarmerLocation {
  locationId: number;
  farmerId: number;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  pincode: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  country: string;
  source: 'gps' | 'pincode';
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function mapRowToLocation(row: Record<string, unknown>): IFarmerLocation {
  return {
    locationId: Number(row['location_id']),
    farmerId: Number(row['farmer_id']),
    latitude: row['latitude'] != null ? Number(row['latitude']) : null,
    longitude: row['longitude'] != null ? Number(row['longitude']) : null,
    accuracy: row['accuracy'] != null ? Number(row['accuracy']) : null,
    pincode: (row['pincode'] as string) || null,
    city: (row['city'] as string) || null,
    district: (row['district'] as string) || null,
    state: (row['state'] as string) || null,
    country: (row['country'] as string) || 'India',
    source: (row['source'] as 'gps' | 'pincode') || 'pincode',
    isVerified: Boolean(row['is_verified']),
    isActive: Boolean(row['is_active']),
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}
