export interface ISmsProvider {
  sendOtp(phoneNumber: string, otp: string): Promise<boolean>;
}
