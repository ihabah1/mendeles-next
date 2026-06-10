import api from "./client";

export interface SupportRequest {
  id: number;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  details: string;
  ipAddress: string | null;
}

export const supportAdminService = {
  async list(limit = 20): Promise<SupportRequest[]> {
    const { data } = await api.get<{ requests: SupportRequest[] }>(
      "/admin/support-requests/",
      { params: { limit } },
    );
    return data.requests;
  },
};
