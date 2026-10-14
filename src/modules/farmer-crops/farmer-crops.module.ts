import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FarmerCropsController } from './farmer-crops.controller';
import { FarmerCropsService } from './farmer-crops.service';
import { FarmerCropsRepository } from './repositories/farmer-crops.repository';

@Module({
  imports: [AuthModule],
  controllers: [FarmerCropsController],
  providers: [FarmerCropsService, FarmerCropsRepository],
  exports: [FarmerCropsService, FarmerCropsRepository],
})
export class FarmerCropsModule {}
