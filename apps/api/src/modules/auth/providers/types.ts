export type OtpDeliveryChannel = 'EMAIL' | 'PHONE';
export type OtpDeliveryPurpose = 'signup' | 'login';

export interface OtpDeliverySendInput {
  channel: OtpDeliveryChannel;
  target: string;
  code: string;
  purpose: OtpDeliveryPurpose;
}

export interface OtpDeliveryProvider {
  send(input: OtpDeliverySendInput): Promise<void>;
}
