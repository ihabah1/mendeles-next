/** Shared API data types mirroring the Django REST serializers. */

export type UserRole = "admin" | "team" | "customer";

export interface ApiUser {
  id: number;
  email: string;
  username: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  is_staff: boolean;
  date_joined: string;
  display_name: string;
  is_admin: boolean;
  email_verified: boolean;
  phone_verified: boolean;
}

export interface VerificationEmailPayload {
  to: string;
  display_name: string;
  verify_url: string;
}

export interface RegisterResponse {
  detail: string;
  email: string;
  verification_required: boolean;
  email_send_via?: "backend" | "frontend" | "dev-log";
  /** Present when email_send_via is frontend — avoids EMAIL_PROXY_DERIVE_FROM on register. */
  verification_payload?: VerificationEmailPayload;
  phone_verification_required?: boolean;
  phone?: string;
  /** DEBUG + SMS_PROVIDER=log only */
  dev_otp?: string;
}

export interface VerifyEmailResponse extends LoginResponse {
  detail: string;
  phone_verification_required?: boolean;
}

export interface VerifyPhoneResponse extends LoginResponse {
  detail: string;
}

export interface FirebaseVerifyPhoneResponse extends LoginResponse {
  detail: string;
  phone_number: string;
  phone_verified: boolean;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface LoginResponse extends TokenPair {
  user: ApiUser;
}

export interface RegisterPayload {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface Order {
  id: number;
  customer: number;
  customer_email: string;
  order_number: string;
  draw_name: string;
  forms_count: number;
  amount_ils: string;
  status: string;
  created_at: string;
  printed_at?: string | null;
  scanned_at?: string | null;
  has_scan?: boolean;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
