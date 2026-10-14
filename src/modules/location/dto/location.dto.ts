import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class SubmitGpsLocationDto {
  @ApiProperty({ example: 23.0225 })
  @IsNumber()
  @Min(-90) @Max(90)
  latitude: number;

  @ApiProperty({ example: 72.5714 })
  @IsNumber()
  @Min(-180) @Max(180)
  longitude: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  accuracy?: number;
}

export class SubmitPincodeLocationDto {
  @ApiProperty({ example: '380001' })
  @IsString()
  pincode: string;

  @ApiProperty({ example: 'Ahmedabad' })
  @IsString()
  city: string;

  @ApiPropertyOptional({ example: 'Gujarat' })
  @IsOptional()
  @IsString()
  state?: string;
}
