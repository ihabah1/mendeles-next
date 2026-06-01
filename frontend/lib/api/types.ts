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
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
