import { createHash } from "crypto";

const SALT = "mandeles-email-proxy:";

/** Must match backend api.services.email_proxy_secret.get_email_proxy_secret */
export function getEmailProxySecret(): string {
  const explicit = process.env.EMAIL_PROXY_SECRET?.trim();
  if (explicit) return explicit;

  const derive = process.env.EMAIL_PROXY_DERIVE_FROM?.trim();
  if (derive) {
    return createHash("sha256").update(`${SALT}${derive}`).digest("hex");
  }

  return "";
}
