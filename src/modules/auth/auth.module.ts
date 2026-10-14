import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { FarmerProfilesModule } from '../farmer-profiles/farmer-profiles.module';
import { RedisModule } from '../../providers/redis/redis.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Global()
@Module({
  imports: [
    JwtModule.register({ global: true }),
    FarmerProfilesModule,
    RedisModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
