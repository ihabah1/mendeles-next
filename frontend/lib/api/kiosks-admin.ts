/** Staff kiosk booth management. */
import api from "./client";

export interface KioskRecord {
  id: number;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  location: string;
  isActive: boolean;
  active: boolean;
  pricePerTable: number;
  apiKeyHint: string | null;
  apiKey?: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface KioskSiteUser {
  id: number;
  email: string;
  displayName: string;
  phone: string;
  role: string;
  dateJoined: string | null;
}

export const kiosksAdminService = {
  async list(): Promise<{ kiosks: KioskRecord[]; count: number }> {
    const { data } = await api.get<{ kiosks: KioskRecord[]; count: number }>("/admin/kiosks/");
    return data;
  },

  async listSiteUsers(q?: string): Promise<{ users: KioskSiteUser[]; count: number }> {
    const { data } = await api.get<{ users: KioskSiteUser[]; count: number }>(
      "/admin/kiosks/site-users/",
      { params: q ? { q } : undefined },
    );
    return data;
  },

  async create(payload: {
    name: string;
    ownerName?: string;
    email: string;
    password: string;
    location?: string;
    phone?: string;
    pricePerTable?: number;
  }): Promise<{ kiosk: KioskRecord; detail: string }> {
    const { data } = await api.post<{ kiosk: KioskRecord; detail: string }>(
      "/admin/kiosks/",
      {
        name: payload.name,
        ownerName: payload.ownerName ?? "",
        email: payload.email,
        password: payload.password,
        location: payload.location ?? "",
        phone: payload.phone ?? "",
        pricePerTable: payload.pricePerTable ?? 3,
      },
    );
    return data;
  },

  async update(
    kioskId: number,
    payload: Partial<{
      name: string;
      ownerName: string;
      email: string;
      password: string;
      location: string;
      phone: string;
      isActive: boolean;
      pricePerTable: number;
    }>,
  ): Promise<{ kiosk: KioskRecord; detail: string }> {
    const { data } = await api.patch<{ kiosk: KioskRecord; detail: string }>(
      `/admin/kiosks/${kioskId}/`,
      payload,
    );
    return data;
  },

  async toggle(
    kioskId: number,
    isActive?: boolean,
  ): Promise<{ kiosk: KioskRecord; detail: string }> {
    if (isActive !== undefined) {
      return kiosksAdminService.update(kioskId, { isActive });
    }
    const { data } = await api.post<{ kiosk: KioskRecord; detail: string }>(
      `/admin/kiosks/${kioskId}/toggle/`,
      {},
    );
    return data;
  },
};
