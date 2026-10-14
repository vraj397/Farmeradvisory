import { Injectable, Logger } from '@nestjs/common';
import { ISmsProvider } from './sms-provider.interface';

@Injectable()
export class MockSmsProvider implements ISmsProvider {
  private readonly logger = new Logger(MockSmsProvider.name);

  async sendOtp(phoneNumber: string, otp: string): Promise<boolean> {
    this.logger.log(`[MOCK SMS PROVIDER] OTP sent to ${phoneNumber}: ${otp}`);
    return true;
  }
}
