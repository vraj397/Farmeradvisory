import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { ActivityType } from '../activities.types';

const ACTIVITY_TYPES: ActivityType[] = ['sowing','irrigation','fertilizer','pesticide','weeding','pest_observation','disease_observation','rainfall','harvesting','inspection','custom'];

export class CreateActivityDto {
  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  farmerCropId?: number;

  @ApiProperty({ enum: ACTIVITY_TYPES })
  @IsEnum(ACTIVITY_TYPES)
  activityType: ActivityType;

  @ApiProperty({ example: 'Applied NPK fertilizer' })
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '2026-08-10T08:00:00Z' })
  @IsOptional()
  @IsDateString()
  activityDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateActivityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  activityDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
