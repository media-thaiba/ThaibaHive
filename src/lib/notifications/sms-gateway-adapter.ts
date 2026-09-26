export interface SMSDispatchResult {
  success: boolean;
  messageId: string;
  provider: "TWILIO" | "AWS_SNS" | "MOCK_GATEWAY";
  recipientPhone: string;
  errorMessage?: string;
  dispatchedAt: string;
}

export class SMSGatewayAdapter {
  private providerName: "TWILIO" | "AWS_SNS" | "MOCK_GATEWAY";

  constructor() {
    this.providerName = (process.env.SMS_PROVIDER as any) || "MOCK_GATEWAY";
  }

  async sendSMS(_tenantId: string, recipientPhone: string, _messageBody: string): Promise<SMSDispatchResult> {
    const now = new Date().toISOString();
    const messageId = `msg_sms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (!recipientPhone || recipientPhone.trim().length === 0) {
      return {
        success: false,
        messageId,
        provider: this.providerName,
        recipientPhone: recipientPhone || "UNKNOWN",
        errorMessage: "Recipient phone number is invalid or empty",
        dispatchedAt: now,
      };
    }

    // Simulated gateway response
    return {
      success: true,
      messageId,
      provider: this.providerName,
      recipientPhone,
      dispatchedAt: now,
    };
  }
}

export const defaultSMSGateway = new SMSGatewayAdapter();
