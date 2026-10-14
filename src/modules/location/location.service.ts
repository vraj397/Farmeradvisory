import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import { SubmitGpsLocationDto, SubmitPincodeLocationDto } from './dto/location.dto';
import { LocationRepository } from './repositories/location.repository';
import { IFarmerLocation } from './location.types';

interface ReverseGeocodeResult {
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  country: string;
}

function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'FarmerAdvisory/1.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(private readonly locationRepo: LocationRepository) {}

  async submitGpsLocation(farmerId: number, dto: SubmitGpsLocationDto): Promise<IFarmerLocation> {
    const geo = await this.reverseGeocode(dto.latitude, dto.longitude);

    await this.locationRepo.deactivateAll(farmerId);

    return this.locationRepo.create({
      farmerId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracy: dto.accuracy ?? null,
      pincode: geo.pincode,
      city: geo.city,
      district: geo.district,
      state: geo.state,
      country: geo.country,
      source: 'gps',
      isVerified: true,
    });
  }

  async submitPincodeLocation(farmerId: number, dto: SubmitPincodeLocationDto): Promise<IFarmerLocation> {
    const pincode = dto.pincode.trim();
    const city = dto.city.trim();

    if (!/^\d{6}$/.test(pincode)) {
      throw new BadRequestException('Pincode must be exactly 6 digits.');
    }

    // Try to reverse-validate via OpenStreetMap Nominatim
    let district: string | null = null;
    let state: string | null = dto.state || null;
    let latitude: number | null = null;
    let longitude: number | null = null;

    try {
      const url = `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json&limit=1&addressdetails=1`;
      const raw = await httpGet(url);
      const results = JSON.parse(raw);
      if (results && results.length > 0) {
        const addr = results[0].address || {};
        district = addr.county || addr.state_district || null;
        state = addr.state || state;
        latitude = parseFloat(results[0].lat) || null;
        longitude = parseFloat(results[0].lon) || null;
      }
    } catch (err: any) {
      this.logger.warn(`Pincode geocode failed: ${err.message}`);
    }

    await this.locationRepo.deactivateAll(farmerId);

    return this.locationRepo.create({
      farmerId,
      latitude,
      longitude,
      accuracy: null,
      pincode,
      city,
      district,
      state,
      country: 'India',
      source: 'pincode',
      isVerified: true,
    });
  }

  async getCurrentLocation(farmerId: number): Promise<IFarmerLocation | null> {
    return this.locationRepo.findActiveByFarmerId(farmerId);
  }

  private async reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult> {
    const result: ReverseGeocodeResult = { city: null, district: null, state: null, pincode: null, country: 'India' };

    try {
      // Primary: BigDataCloud (no key required)
      const bdUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
      const bdRaw = await httpGet(bdUrl);
      const bd = JSON.parse(bdRaw);
      result.city = bd.locality || bd.city || null;
      result.district = bd.principalSubdivision || null;
      result.state = bd.principalSubdivision || null;
      result.pincode = bd.postcode || null;
      result.country = bd.countryName || 'India';
      if (result.city) return result;
    } catch (e: any) {
      this.logger.warn(`BigDataCloud geocode failed: ${e.message}`);
    }

    try {
      // Fallback: Nominatim
      const nmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
      const nmRaw = await httpGet(nmUrl);
      const nm = JSON.parse(nmRaw);
      const addr = nm.address || {};
      result.city = addr.city || addr.town || addr.village || null;
      result.district = addr.county || addr.state_district || null;
      result.state = addr.state || null;
      result.pincode = addr.postcode || null;
      result.country = addr.country || 'India';
    } catch (e: any) {
      this.logger.warn(`Nominatim geocode failed: ${e.message}`);
    }

    return result;
  }
}
