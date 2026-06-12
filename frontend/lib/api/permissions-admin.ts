/** Staff permissions management — grant Premium and per-feature access. */
import api from "./client";

export interface PermissionRow {
  key: string;
  label: string;
  hint: string;
  granted: boolean;
}

export interface ManagedUser {
  id: number;
  email: string;
  displayName: string;
  fullName: string;
  phone: string;
  role: string;
  roleLabel: string;
  isActive: boolean;
  isStaff: boolean;
  isPremium: boolean;
  premiumExpiresAt: string | null;
  dateJoined: string;
  balanceIls: number;
  permissions: PermissionRow[];
}

export const permissionsAdminService = {
  async listUsers(params?: { q?: string; role?: string }): Promise<{
    users: ManagedUser[];
    count: number;
  }> {
    const { data } = await api.get<{ users: ManagedUser[]; count: number }>(
      "/admin/permissions/users/",
      { params },
    );
    return data;
  },

  async getUser(userId: number): Promise<ManagedUser> {
    const { data } = await api.get<ManagedUser>(`/admin/permissions/users/${userId}/`);
    return data;
  },

  async setPermission(userId: number, permission: string, granted: boolean): Promise<ManagedUser> {
    const { data } = await api.patch<{ user: ManagedUser }>(
      `/admin/permissions/users/${userId}/`,
      { permission, granted },
    );
    return data.user;
  },

  async grantAll(userId: number): Promise<ManagedUser> {
    const { data } = await api.patch<{ user: ManagedUser }>(
      `/admin/permissions/users/${userId}/`,
      { grant_all: true },
    );
    return data.user;
  },

  async revokeAll(userId: number): Promise<ManagedUser> {
    const { data } = await api.patch<{ user: ManagedUser }>(
      `/admin/permissions/users/${userId}/`,
      { revoke_all: true },
    );
    return data.user;
  },

  async grantPremium(userId: number, days = 30): Promise<ManagedUser> {
    const { data } = await api.post<{ user: ManagedUser }>(
      `/admin/permissions/users/${userId}/`,
      { action: "grant_premium", days },
    );
    return data.user;
  },

  async revokePremium(userId: number): Promise<ManagedUser> {
    const { data } = await api.post<{ user: ManagedUser }>(
      `/admin/permissions/users/${userId}/`,
      { action: "revoke_premium" },
    );
    return data.user;
  },

  async setRole(userId: number, role: "customer" | "team"): Promise<ManagedUser> {
    const { data } = await api.patch<{ user: ManagedUser }>(
      `/admin/permissions/users/${userId}/`,
      { role },
    );
    return data.user;
  },

  async setActive(userId: number, isActive: boolean): Promise<ManagedUser> {
    const { data } = await api.patch<{ user: ManagedUser }>(
      `/admin/permissions/users/${userId}/`,
      { is_active: isActive },
    );
    return data.user;
  },

  async deleteUser(userId: number): Promise<{ detail: string }> {
    const { data } = await api.delete<{ detail: string }>(
      `/admin/permissions/users/${userId}/`,
    );
    return data;
  },

  async deleteUsers(userIds: number[]): Promise<{
    detail: string;
    deleted: string[];
    skipped: string[];
    count: number;
  }> {
    const { data } = await api.post<{
      detail: string;
      deleted: string[];
      skipped: string[];
      count: number;
    }>("/admin/permissions/users/bulk-delete/", { user_ids: userIds });
    return data;
  },
};
