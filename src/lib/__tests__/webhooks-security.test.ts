import { POST as voiceHandler } from "@/app/api/engage/voice/route";
import { POST as financeWebhookHandler } from "@/app/api/finance/fees/webhooks/route";
import crypto from "crypto";

const mockProcessUserMessage = jest.fn();

jest.mock("@/lib/operations/engage/conversational/dialog-manager", () => ({
  DialogManager: {
    getInstance: () => ({
      processUserMessage: mockProcessUserMessage,
    }),
  },
}));

describe("Webhooks Security & Ingestion Hardening (Task A3 / Blocker B4)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.APP_URL;
    mockProcessUserMessage.mockResolvedValue({
      botReplyText: "Welcome to Thaiba Higher Education Group voice assistant. How can I help you today?",
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("Twilio Voice Webhook", () => {
    it("should accept validly signed Twilio request", async () => {
      const authToken = "test_twilio_auth_token_12345";
      process.env.TWILIO_AUTH_TOKEN = authToken;

      const url = "http://localhost/api/engage/voice";
      const payload = { From: "+919876543210", SpeechResult: "Hello assistant" };

      // Generate valid Twilio signature: URL + sorted key/value
      let data = url;
      const sortedKeys = Object.keys(payload).sort();
      for (const k of sortedKeys) {
        data += k + (payload as any)[k];
      }
      const signature = crypto
        .createHmac("sha1", authToken)
        .update(Buffer.from(data, "utf-8"))
        .digest("base64");

      const req = new Request(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-twilio-signature": signature,
        },
        body: JSON.stringify(payload),
      });

      const res = await voiceHandler(req);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("<Response>");
    });

    it("should reject forged or unsigned Twilio request with 401", async () => {
      process.env.TWILIO_AUTH_TOKEN = "test_twilio_auth_token_12345";

      const req = new Request("http://localhost/api/engage/voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-twilio-signature": "forged_signature_12345",
        },
        body: JSON.stringify({ From: "+919876543210", SpeechResult: "Hello" }),
      });

      const res = await voiceHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("Invalid or missing Twilio signature");
    });

    it("should XML-escape dynamic responses to prevent TwiML injection", async () => {
      mockProcessUserMessage.mockResolvedValue({
        botReplyText: '<Say voice="man">Injected XML attack</Say><Redirect>/malicious</Redirect>',
      });

      process.env.TWILIO_AUTH_TOKEN = "test_token";
      const url = "http://localhost/api/engage/voice";
      const payload = {
        From: "+919876543210",
        SpeechResult: "test input",
      };

      let data = url;
      for (const k of Object.keys(payload).sort()) {
        data += k + (payload as any)[k];
      }
      const signature = crypto.createHmac("sha1", "test_token").update(data).digest("base64");

      const req = new Request(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-twilio-signature": signature,
        },
        body: JSON.stringify(payload),
      });

      const res = await voiceHandler(req);
      expect(res.status).toBe(200);
      const text = await res.text();
      // Verify raw unescaped injection is not present
      expect(text).not.toContain('<Redirect>/malicious</Redirect>');
      // Verify escaped characters
      expect(text).toContain('&lt;Say');
      expect(text).toContain('&lt;Redirect&gt;/malicious&lt;/Redirect&gt;');
    });
  });

  describe("Finance Fees Webhook", () => {
    it("should return sanitized 401 when signature is invalid", async () => {
      const req = new Request("http://localhost/api/finance/fees/webhooks?gateway=razorpay", {
        method: "POST",
        headers: {
          "x-razorpay-signature": "invalid_sig",
        },
        body: JSON.stringify({ event: "payment.failed" }),
      });

      const res = await financeWebhookHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json).toEqual({ error: "Invalid webhook signature" });
    });
  });

  describe("Twilio Public URL Resolution", () => {
    it("should correctly validate Twilio signature against configured NEXT_PUBLIC_APP_URL", async () => {
      const authToken = "test_twilio_auth_token_public_url";
      process.env.TWILIO_AUTH_TOKEN = authToken;
      process.env.NEXT_PUBLIC_APP_URL = "https://thaibahive.com";

      const internalReqUrl = "http://10.0.0.5:3000/api/engage/voice";
      const publicUrl = "https://thaibahive.com/api/engage/voice";
      const payload = { From: "+919876543210", SpeechResult: "Testing public url" };

      // Twilio signs against public URL
      let data = publicUrl;
      for (const k of Object.keys(payload).sort()) {
        data += k + (payload as any)[k];
      }
      const signature = crypto
        .createHmac("sha1", authToken)
        .update(Buffer.from(data, "utf-8"))
        .digest("base64");

      const req = new Request(internalReqUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-twilio-signature": signature,
        },
        body: JSON.stringify(payload),
      });

      const res = await voiceHandler(req);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("<Response>");
    });
  });
});
