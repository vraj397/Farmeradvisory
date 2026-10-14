import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateActivityDto, UpdateActivityDto } from './dto/activity.dto';
import { ActivitiesRepository } from './repositories/activities.repository';
import { ICropActivity } from './activities.types';

@Injectable()
export class ActivitiesService {
  constructor(private readonly activitiesRepo: ActivitiesRepository) {}

  async getAll(farmerId: number): Promise<ICropActivity[]> {
    return this.activitiesRepo.findByFarmer(farmerId);
  }

  async create(farmerId: number, dto: CreateActivityDto): Promise<ICropActivity> {
    return this.activitiesRepo.create(farmerId, {
      farmerCropId: dto.farmerCropId,
      activityType: dto.activityType,
      title: dto.title,
      description: dto.description,
      activityDate: dto.activityDate ? new Date(dto.activityDate) as unknown as Date : new Date(),
      metadata: dto.metadata,
    });
  }

  async update(activityId: number, farmerId: number, dto: UpdateActivityDto): Promise<ICropActivity> {
    const existing = await this.activitiesRepo.findByIdAndFarmer(activityId, farmerId);
    if (!existing) throw new NotFoundException('Activity not found or does not belong to this farmer');
    const updated = await this.activitiesRepo.update(activityId, farmerId, {
      title: dto.title,
      description: dto.description,
      activityDate: dto.activityDate ? new Date(dto.activityDate) as unknown as Date : undefined,
      metadata: dto.metadata,
    });
    return updated!;
  }

  async remove(activityId: number, farmerId: number): Promise<void> {
    const existing = await this.activitiesRepo.findByIdAndFarmer(activityId, farmerId);
    if (!existing) throw new NotFoundException('Activity not found or does not belong to this farmer');
    await this.activitiesRepo.delete(activityId, farmerId);
  }
}
