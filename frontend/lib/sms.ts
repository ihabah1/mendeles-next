export async function sendSms(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || sid === "ACdummy" || !from) {
    console.log(`[SMS dev] → ${to}: ${body}`);
    return false;
  }
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${auth}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }),
    }
  );
  return res.ok;
}

export async function sendOtp(phone: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  const vsid = process.env.TWILIO_VERIFY_SID;
  if (!sid || sid === "ACdummy" || !vsid) {
    console.log(`[OTP dev] → ${phone}`);
    return true;
  }
  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${vsid}/Verifications`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${auth}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phone, Channel: "sms", Locale: "he" }),
    }
  );
  return res.ok;
}

export async function verifyOtp(phone: string, code: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  const vsid = process.env.TWILIO_VERIFY_SID;
  if (!sid || sid === "ACdummy" || !vsid) return true; // dev mode
  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${vsid}/VerificationChecks`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${auth}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phone, Code: code }),
    }
  );
  const d = await res.json();
  return d.status === "approved";
}
