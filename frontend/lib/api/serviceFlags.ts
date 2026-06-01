import api from "./client";

export interface ServiceFlag {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  requires_restart: boolean;
  updated_at: string | null;
}

export const serviceFlagsApi = {
  async list(): Promise<ServiceFlag[]> {
    const { data } = await api.get<{ flags: ServiceFlag[] }>("/admin/service-flags/");
    return data.flags;
  },

  async update(updates: Record<string, boolean>): Promise<ServiceFlag[]> {
    const { data } = await api.patch<{ flags: ServiceFlag[] }>(
      "/admin/service-flags/",
      { flags: updates },
    );
    return data.flags;
  },
};
