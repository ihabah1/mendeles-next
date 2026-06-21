/** Staff kiosk booth management. */
import api from "./client";

export interface KioskRecord {
  id: number;
  name: string;
  email: string;
  location: string;
  isActive: boolean;
  apiKeyHint: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export const kiosksAdminService = {
  async list(): Promise<{ kiosks: KioskRecord[]; count: number }> {
    const { data } = await api.get<{ kiosks: KioskRecord[]; count: number }>("/admin/kiosks/");
    return data;
  },

  async create(payload: {
    name: string;
    email: string;
    password: string;
    location?: string;
  }): Promise<{ kiosk: KioskRecord; detail: string }> {
    const { data } = await api.post<{ kiosk: KioskRecord; detail: string }>(
      "/admin/kiosks/",
      {
        name: payload.name,
        email: payload.email,
        password: payload.password,
        location: payload.location ?? "",
      },
    );
    return data;
  },

  async toggle(
    kioskId: number,
    isActive?: boolean,
  ): Promise<{ kiosk: KioskRecord; detail: string }> {
    const body = isActive === undefined ? {} : { is_active: isActive };
    const { data } = await api.post<{ kiosk: KioskRecord; detail: string }>(
      `/admin/kiosks/${kioskId}/toggle/`,
      body,
    );
    return data;
  },
};
