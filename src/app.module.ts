import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { AdminModule } from './modules/admin/admin.module';
import { AdvisoryModule } from './modules/advisory/advisory.module';
import { AiChatModule } from './modules/ai-chat/ai-chat.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CropsModule } from './modules/crops/crops.module';
import { DiagnosisModule } from './modules/diagnosis/diagnosis.module';
import { ExpertEscalationModule } from './modules/expert-escalation/expert-escalation.module';
import { FarmerCropsModule } from './modules/farmer-crops/farmer-crops.module';
import { FarmerProfilesModule } from './modules/farmer-profiles/farmer-profiles.module';
import { FarmsModule } from './modules/farms/farms.module';
import { HealthModule } from './modules/health/health.module';
import { LocationModule } from './modules/location/location.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SchemesModule } from './modules/schemes/schemes.module';
import { WeatherModule } from './modules/weather/weather.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    FarmerProfilesModule,
    FarmsModule,
    CropsModule,
    WeatherModule,
    AdvisoryModule,
    DiagnosisModule,
    ExpertEscalationModule,
    ReportsModule,
    LocationModule,
    FarmerCropsModule,
    ActivitiesModule,
    NotificationsModule,
    SchemesModule,
    AiChatModule,
    AdminModule,
    AuditModule,
  ],
})
export class AppModule {}
