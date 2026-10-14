import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateFarmerCropDto, UpdateFarmerCropDto } from './dto/farmer-crop.dto';
import { FarmerCropsRepository } from './repositories/farmer-crops.repository';
import { IFarmerCrop } from './farmer-crops.types';

@Injectable()
export class FarmerCropsService {
  constructor(private readonly farmerCropsRepo: FarmerCropsRepository) {}

  async getAll(farmerId: number): Promise<IFarmerCrop[]> {
    return this.farmerCropsRepo.findAllByFarmer(farmerId);
  }

  async create(farmerId: number, dto: CreateFarmerCropDto): Promise<IFarmerCrop> {
    return this.farmerCropsRepo.create(farmerId, {
      cropId: dto.cropId,
      cropName: dto.cropName,
      variety: dto.variety,
      area: dto.area,
      sowingDate: dto.sowingDate,
      expectedHarvestDate: dto.expectedHarvestDate,
      currentStage: dto.currentStage ?? 'vegetative',
      status: 'active',
      notes: dto.notes,
    });
  }

  async update(farmerCropId: number, farmerId: number, dto: UpdateFarmerCropDto): Promise<IFarmerCrop> {
    const crop = await this.farmerCropsRepo.findByIdAndFarmer(farmerCropId, farmerId);
    if (!crop) throw new NotFoundException(`Crop not found or does not belong to this farmer`);

    const updated = await this.farmerCropsRepo.update(farmerCropId, farmerId, {
      variety: dto.variety,
      area: dto.area,
      sowingDate: dto.sowingDate,
      expectedHarvestDate: dto.expectedHarvestDate,
      currentStage: dto.currentStage,
      status: dto.status,
      notes: dto.notes,
    });

    return updated!;
  }

  async remove(farmerCropId: number, farmerId: number): Promise<void> {
    const crop = await this.farmerCropsRepo.findByIdAndFarmer(farmerCropId, farmerId);
    if (!crop) throw new NotFoundException(`Crop not found or does not belong to this farmer`);
    await this.farmerCropsRepo.softDelete(farmerCropId, farmerId);
  }
}
