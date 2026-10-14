import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { RowDataPacket } from 'mysql2/promise';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../../database/database.service';
import { FarmersRepository } from '../farmer-profiles/repositories/farmers.repository';
import { RedisService } from '../../providers/redis/redis.service';
import { MockSmsProvider } from './providers/mock-sms.provider';
import { ISmsProvider } from './providers/sms-provider.interface';
import { OfficerLoginDto } from './dto/officer-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { UnauthorizedException } from '@nestjs/common';

/** Normalize Indian phone numbers to +91XXXXXXXXXX format */
function normalizeIndianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 13 && digits.startsWith('091')) return `+${digits.slice(1)}`;
  return `+91${digits.slice(-10)}`;
}

interface IOtpPayload {
  hashedOtp: string;
  attempts: number;
  createdAt: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly smsProvider: ISmsProvider;

  constructor(
    private readonly farmersRepository: FarmersRepository,
    private readonly database: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    const otpMode = this.configService.get<string>('OTP_MODE', 'mock');
    this.smsProvider = new MockSmsProvider();
    if (otpMode !== 'mock') {
      // Future: inject real SMS provider here based on SMS_PROVIDER env
      this.logger.warn(`OTP_MODE=${otpMode} — SMS provider not yet configured; falling back to mock.`);
    }
  }

  // -----------------------------------------------------------------
  // FARMER AUTH
  // -----------------------------------------------------------------

  async sendOtp(dto: SendOtpDto): Promise<{ message: string; devOtp?: string }> {
    const normalizedPhone = normalizeIndianPhone(dto.phoneNumber);
    const now = Date.now();

    // 60-second resend cooldown check
    const cooldownKey = `otp_cooldown:${normalizedPhone}`;
    const cooldownVal = await this.redisService.get(cooldownKey);
    if (cooldownVal) {
      const ttlSeconds = await this.redisService.ttl(cooldownKey);
      throw new BadRequestException(
        `Please wait ${ttlSeconds} second(s) before requesting a new OTP.`,
      );
    }

    // Check existing OTP for max attempts
    const otpKey = `otp:${normalizedPhone}`;
    const existingRaw = await this.redisService.get(otpKey);
    if (existingRaw) {
      const existing: IOtpPayload = JSON.parse(existingRaw);
      const maxAttempts = this.configService.get<number>('OTP_MAX_ATTEMPTS', 5);
      if (existing.attempts >= maxAttempts) {
        throw new BadRequestException(
          'Too many failed OTP attempts. Please wait 5 minutes before requesting again.',
        );
      }
    }

    // Generate cryptographically secure 6-digit OTP
    const otpLength = this.configService.get<number>('OTP_LENGTH', 6);
    const otpNumber = crypto.randomInt(0, Math.pow(10, otpLength));
    const otp = String(otpNumber).padStart(otpLength, '0');

    const otpTtl = this.configService.get<number>('OTP_EXPIRES_IN', 300);
    const cooldownTtl = this.configService.get<number>('OTP_RESEND_COOLDOWN', 60);

    // Hash OTP before storing in Redis (never store plain OTP)
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const payload: IOtpPayload = { hashedOtp, attempts: 0, createdAt: now };

    await this.redisService.set(otpKey, JSON.stringify(payload), otpTtl);
    await this.redisService.set(cooldownKey, '1', cooldownTtl);

    // Send via provider (mock logs it; production sends via SMS)
    await this.smsProvider.sendOtp(normalizedPhone, otp);
    this.logger.log(`OTP sent to ${normalizedPhone}`);

    const otpMode = this.configService.get<string>('OTP_MODE', 'mock');
    return {
      message: `OTP sent successfully to ${normalizedPhone}`,
      ...(otpMode === 'mock' ? { devOtp: otp } : {}),
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const normalizedPhone = normalizeIndianPhone(dto.phoneNumber);
    const otpKey = `otp:${normalizedPhone}`;
    const storedRaw = await this.redisService.get(otpKey);

    if (!storedRaw) {
      throw new BadRequestException('OTP has expired or was not requested. Please request a new OTP.');
    }

    const stored: IOtpPayload = JSON.parse(storedRaw);
    const maxAttempts = this.configService.get<number>('OTP_MAX_ATTEMPTS', 5);

    if (stored.attempts >= maxAttempts) {
      await this.redisService.del(otpKey);
      throw new BadRequestException('Too many invalid attempts. OTP has been invalidated.');
    }

    const hashedInput = crypto.createHash('sha256').update(dto.otp).digest('hex');
    if (stored.hashedOtp !== hashedInput) {
      stored.attempts += 1;
      const remaining = maxAttempts - stored.attempts;
      await this.redisService.set(
        otpKey,
        JSON.stringify(stored),
        this.configService.get<number>('OTP_EXPIRES_IN', 300),
      );
      throw new BadRequestException(
        `Invalid OTP code. ${remaining} attempt(s) remaining.`,
      );
    }

    // OTP correct — clean up Redis keys
    await this.redisService.del(otpKey);
    await this.redisService.del(`otp_cooldown:${normalizedPhone}`);

    // Upsert farmer
    let farmer = await this.farmersRepository.findByPhone(normalizedPhone);
    if (!farmer) {
      farmer = await this.farmersRepository.create({
        phoneNumber: normalizedPhone,
        name: dto.name,
        preferredLanguage: dto.preferredLanguage || 'en',
      });
    } else if (dto.name || dto.preferredLanguage) {
      farmer = (await this.farmersRepository.update(farmer.farmerId, {
        name: dto.name,
        preferredLanguage: dto.preferredLanguage,
      })) ?? farmer;
    }

    const payload = {
      userId: farmer.farmerId,
      phoneNumber: farmer.phoneNumber,
      role: 'FARMER',
    };

    const tokens = await this.generateTokens(payload);
    return {
      message: 'Authentication successful',
      farmer,
      ...tokens,
    };
  }

  // -----------------------------------------------------------------
  // OFFICER AUTH
  // -----------------------------------------------------------------

  async officerLogin(dto: OfficerLoginDto) {
    const { identifier, password } = dto;

    const rows = await this.database.query<RowDataPacket[]>(
      `SELECT officer_id, name, phone_number, email, password_hash, role, district_id, is_active
       FROM officers
       WHERE (phone_number = ? OR email = ?) AND is_active = TRUE
       LIMIT 1`,
      [identifier, identifier],
    );

    if (!rows || rows.length === 0) {
      throw new UnauthorizedException('Invalid officer credentials or inactive account');
    }

    const officer = rows[0];
    const isPasswordValid = await bcrypt.compare(password, officer.password_hash || '');
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid officer credentials');
    }

    const payload = {
      userId: Number(officer.officer_id),
      email: officer.email,
      phoneNumber: officer.phone_number,
      role: officer.role,
      districtId: officer.district_id ? Number(officer.district_id) : undefined,
    };

    const tokens = await this.generateTokens(payload);
    return {
      message: 'Officer login successful',
      officer: {
        officerId: Number(officer.officer_id),
        name: officer.name,
        email: officer.email,
        phoneNumber: officer.phone_number,
        role: officer.role,
        districtId: officer.district_id,
      },
      ...tokens,
    };
  }

  // -----------------------------------------------------------------
  // TOKEN MANAGEMENT
  // -----------------------------------------------------------------

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const secret = this.configService.get<string>(
        'JWT_REFRESH_SECRET',
        'super_secret_farmer_refresh_key_2026',
      );
      const payload = await this.jwtService.verifyAsync(dto.refreshToken, { secret });

      const newPayload = {
        userId: payload.userId,
        phoneNumber: payload.phoneNumber,
        email: payload.email,
        role: payload.role,
        districtId: payload.districtId,
      };

      return this.generateTokens(newPayload);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async generateTokens(payload: Record<string, unknown>) {
    const accessSecret = this.configService.get<string>(
      'JWT_ACCESS_SECRET',
      'super_secret_farmer_access_key_2026',
    );
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'super_secret_farmer_refresh_key_2026',
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { secret: accessSecret, expiresIn: '15m' }),
      this.jwtService.signAsync(payload, { secret: refreshSecret, expiresIn: '30d' }),
    ]);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900,
    };
  }
}
