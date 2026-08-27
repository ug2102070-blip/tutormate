/**
 * TutorMate SMS Gateway Integration (Greenweb Bangladesh & Twilio Support)
 */

export interface SendSMSOptions {
  to: string;
  message: string;
}

export interface SMSResponse {
  success: boolean;
  provider: "greenweb" | "twilio" | "mock";
  messageId?: string;
  error?: string;
}

/**
 * Formats a Bangladeshi phone number to standard international format (8801XXXXXXXX)
 */
export function formatBDPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("880")) return cleaned;
  if (cleaned.startsWith("0")) return `88${cleaned}`;
  if (cleaned.length === 10) return `880${cleaned}`;
  return cleaned;
}

/**
 * Sends SMS via Greenweb Bangladesh API
 */
async function sendGreenwebSMS(to: string, message: string): Promise<SMSResponse> {
  const token = process.env.GREENWEB_SMS_TOKEN;
  if (!token) {
    throw new Error("GREENWEB_SMS_TOKEN is not configured.");
  }

  const formattedPhone = formatBDPhone(to);
  const params = new URLSearchParams({
    token,
    to: formattedPhone,
    message,
  });

  const response = await fetch("https://api.greenweb.com.bd/api.php", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const text = await response.text();
  if (text.includes("Ok:") || response.ok) {
    return { success: true, provider: "greenweb", messageId: text.trim() };
  } else {
    return { success: false, provider: "greenweb", error: text.trim() };
  }
}

/**
 * Sends SMS via Twilio API
 */
async function sendTwilioSMS(to: string, message: string): Promise<SMSResponse> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("Twilio SMS environment variables are missing.");
  }

  const formattedPhone = to.startsWith("+") ? to : `+${formatBDPhone(to)}`;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const params = new URLSearchParams({
    To: formattedPhone,
    From: fromNumber,
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
    return { success: true, provider: "twilio", messageId: json.sid };
  } else {
    return { success: false, provider: "twilio", error: json.message || "Twilio request failed" };
  }
}

/**
 * Primary SMS Dispatcher — tries Greenweb SMS first, falls back to Twilio or mock mode
 */
export async function sendSMS({ to, message }: SendSMSOptions): Promise<SMSResponse> {
  if (!to || !message) {
    return { success: false, provider: "mock", error: "Recipient and message are required." };
  }

  // 1. Try Greenweb SMS if token is present
  if (process.env.GREENWEB_SMS_TOKEN) {
    try {
      return await sendGreenwebSMS(to, message);
    } catch (err) {
      console.warn("Greenweb SMS failed, attempting Twilio fallback:", err);
    }
  }

  // 2. Try Twilio if configured
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      return await sendTwilioSMS(to, message);
    } catch (err) {
      console.warn("Twilio SMS failed:", err);
    }
  }

  // 3. Simulated/Development Fallback Mode
  console.log(`[SMS MOCK DISPATCH] To: ${to} | Message: ${message}`);
  return {
    success: true,
    provider: "mock",
    messageId: `MOCK-${Date.now()}`,
  };
}

/**
 * Sends a Fee Reminder SMS to student/guardian
 */
export async function sendFeeReminderSMS({
  phone,
  studentName,
  batchName,
  amountDue,
  monthName,
}: {
  phone: string;
  studentName: string;
  batchName: string;
  amountDue: number;
  monthName: string;
}): Promise<SMSResponse> {
  const message = `TutorMate Notice: Dear ${studentName}, tuition fee for ${batchName} (${monthName}) of Tk ${amountDue} is due. Please pay at your earliest convenience.`;
  return sendSMS({ to: phone, message });
}
