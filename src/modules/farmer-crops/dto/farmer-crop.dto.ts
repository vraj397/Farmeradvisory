import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CropStage, CropStatus } from '../farmer-crops.types';

export class CreateFarmerCropDto {
  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  cropId?: number;

  @ApiProperty({ example: 'Wheat' })
  @IsString()
  cropName: string;

  @ApiPropertyOptional({ example: 'HD-2967' })
  @IsOptional()
  @IsString()
  variety?: string;

  @ApiProperty({ example: 2.5, description: 'Area in acres' })
  @IsNumber()
  @Min(0)
  area: number;

  @ApiPropertyOptional({ example: '2026-06-15' })
  @IsOptional()
  @IsDateString()
  sowingDate?: string;

  @ApiPropertyOptional({ example: '2026-10-30' })
  @IsOptional()
  @IsDateString()
  expectedHarvestDate?: string;

  @ApiPropertyOptional({ enum: ['sowing','vegetative','flowering','fruiting','harvesting','post_harvest'] })
  @IsOptional()
  @IsEnum(['sowing','vegetative','flowering','fruiting','harvesting','post_harvest'])
  currentStage?: CropStage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateFarmerCropDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variety?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  area?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  sowingDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedHarvestDate?: string;

  @ApiPropertyOptional({ enum: ['sowing','vegetative','flowering','fruiting','harvesting','post_harvest'] })
  @IsOptional()
  @IsEnum(['sowing','vegetative','flowering','fruiting','harvesting','post_harvest'])
  currentStage?: CropStage;

  @ApiPropertyOptional({ enum: ['active','harvested','archived'] })
  @IsOptional()
  @IsEnum(['active','harvested','archived'])
  status?: CropStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
