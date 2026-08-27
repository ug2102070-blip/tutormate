/**
 * TutorMate WhatsApp Gateway Integration (Twilio WhatsApp API)
 */

import { formatBDPhone } from "./sms";

export interface SendWhatsAppOptions {
  to: string;
  message: string;
}

export interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: "twilio_whatsapp" | "mock";
}

/**
 * Sends WhatsApp message via Twilio WhatsApp API
 */
export async function sendWhatsAppMessage({ to, message }: SendWhatsAppOptions): Promise<WhatsAppResponse> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER;

  if (!to || !message) {
    return { success: false, provider: "mock", error: "Recipient and message are required." };
  }

  if (accountSid && authToken && whatsappNumber) {
    try {
      const formattedTo = `whatsapp:+${formatBDPhone(to)}`;
      const formattedFrom = whatsappNumber.startsWith("whatsapp:") ? whatsappNumber : `whatsapp:${whatsappNumber}`;
      const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

      const params = new URLSearchParams({
        To: formattedTo,
        From: formattedFrom,
        Body: message,
      });

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        }
      );

      const json = await response.json();
      if (response.ok) {
        return { success: true, provider: "twilio_whatsapp", messageId: json.sid };
      } else {
        return { success: false, provider: "twilio_whatsapp", error: json.message || "WhatsApp delivery failed" };
      }
    } catch (err) {
      console.warn("WhatsApp dispatch error:", err);
      return { success: false, provider: "twilio_whatsapp", error: String(err) };
    }
  }

  // Simulated / Development Fallback Mode
  console.log(`[WHATSAPP MOCK DISPATCH] To: ${to} | Message: ${message}`);
  return {
    success: true,
    provider: "mock",
    messageId: `WA-MOCK-${Date.now()}`,
  };
}
