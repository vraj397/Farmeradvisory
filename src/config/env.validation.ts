import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  API_PREFIX: string = 'api/v1';

  @IsString()
  @IsOptional()
  DB_HOST?: string = 'localhost';

  @IsNumber()
  @IsOptional()
  DB_PORT?: number = 3306;

  @IsString()
  @IsOptional()
  DB_NAME?: string = 'crop_advisory';

  @IsString()
  @IsOptional()
  DB_USER?: string = 'root';

  @IsString()
  @IsOptional()
  DB_PASSWORD?: string = '';

  @IsString()
  @IsOptional()
  DATABASE_URL?: string = '';

  @IsString()
  @IsOptional()
  MYSQL_URL?: string = '';

  @IsString()
  @IsOptional()
  DB_SSL?: string = 'false';

  @IsNumber()
  @IsOptional()
  DB_CONNECTION_LIMIT: number = 10;

  @IsString()
  @IsOptional()
  JWT_ACCESS_SECRET: string = 'super_secret_farmer_access_key_2026';

  @IsString()
  @IsOptional()
  JWT_REFRESH_SECRET: string = 'super_secret_farmer_refresh_key_2026';

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN: string = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN: string = '30d';

  @IsString()
  @IsOptional()
  REDIS_HOST?: string = 'localhost';

  @IsNumber()
  @IsOptional()
  REDIS_PORT?: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string = '';

  @IsString()
  @IsOptional()
  WEATHER_PROVIDER: string = 'open_meteo';

  @IsString()
  @IsOptional()
  WEATHER_BASE_URL: string = 'https://api.open-meteo.com/v1';

  @IsString()
  @IsOptional()
  AUTH_METHOD: string = 'phone_otp';

  @IsString()
  @IsOptional()
  OTP_MODE: string = 'mock';

  @IsNumber()
  @IsOptional()
  OTP_LENGTH: number = 6;

  @IsNumber()
  @IsOptional()
  OTP_EXPIRES_IN: number = 300;

  @IsNumber()
  @IsOptional()
  OTP_MAX_ATTEMPTS: number = 5;

  @IsNumber()
  @IsOptional()
  OTP_RESEND_COOLDOWN: number = 60;

  @IsString()
  @IsOptional()
  SMS_PROVIDER?: string = 'mock';

  @IsString()
  @IsOptional()
  SMS_API_KEY?: string = '';

  @IsString()
  @IsOptional()
  SMS_SENDER_ID?: string = '';

  @IsString()
  @IsOptional()
  SMS_OTP_TEMPLATE_ID?: string = '';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Configuration validation error: ${errors.toString()}`);
  }
  return validatedConfig;
}
