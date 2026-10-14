import { plainToInstance, Type } from 'class-transformer';
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

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  API_PREFIX: string = 'api/v1';

  @IsString()
  @IsOptional()
  DB_HOST?: string = 'localhost';

  @Type(() => Number)
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

  @Type(() => Number)
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

  @Type(() => Number)
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

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  OTP_LENGTH: number = 6;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  OTP_EXPIRES_IN: number = 300;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  OTP_MAX_ATTEMPTS: number = 5;

  @Type(() => Number)
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
  const sanitized: Record<string, unknown> = { ...config };

  const numericKeys = [
    'PORT',
    'DB_PORT',
    'DB_CONNECTION_LIMIT',
    'REDIS_PORT',
    'OTP_LENGTH',
    'OTP_EXPIRES_IN',
    'OTP_MAX_ATTEMPTS',
    'OTP_RESEND_COOLDOWN',
  ];

  for (const key of numericKeys) {
    if (sanitized[key] === '' || sanitized[key] === null || sanitized[key] === undefined) {
      delete sanitized[key]; // Allow default value from class instance
    } else {
      const parsed = Number(sanitized[key]);
      if (!isNaN(parsed)) {
        sanitized[key] = parsed;
      }
    }
  }

  // Remove empty strings so default values from EnvironmentVariables apply cleanly
  for (const [k, v] of Object.entries(sanitized)) {
    if (v === '') {
      delete sanitized[k];
    }
  }

  const validatedConfig = plainToInstance(EnvironmentVariables, sanitized, {
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
