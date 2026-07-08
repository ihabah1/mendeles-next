function readEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

export type ContactSiteConfig = {
  phone: string;
  email: string;
  whatsappNumber: string;
  whatsappMessage: string;
};

export function getContactSiteConfig(): ContactSiteConfig {
  const phone = readEnv("NEXT_PUBLIC_CONTACT_PHONE", "CONTACT_PHONE");
  const email = readEnv("NEXT_PUBLIC_CONTACT_EMAIL", "CONTACT_EMAIL");
  const whatsappNumber = readEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "WHATSAPP_NUMBER");
  const whatsappMessage = readEnv(
    "NEXT_PUBLIC_WHATSAPP_PREFILL",
    "WHATSAPP_PREFILL",
  );

  return {
    phone,
    email,
    whatsappNumber,
    whatsappMessage: whatsappMessage || "Hello Mendeles",
  };
}

export function whatsappHref(number: string, message: string): string {
  const digits = number.replace(/\D/g, "");
  if (!digits) return "";
  const text = encodeURIComponent(message);
  return `https://wa.me/${digits}${text ? `?text=${text}` : ""}`;
}
