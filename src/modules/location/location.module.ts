import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LocationController } from './location.controller';
import { LocationRepository } from './repositories/location.repository';
import { LocationService } from './location.service';

@Module({
  imports: [AuthModule],
  controllers: [LocationController],
  providers: [LocationService, LocationRepository],
  exports: [LocationService, LocationRepository],
})
export class LocationModule {}
