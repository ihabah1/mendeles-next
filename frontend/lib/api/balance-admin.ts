/** Staff balance management — set or adjust customer wallet balances. */
import api from "./client";

export interface BalanceUser {
  id: number;
  email: string;
  displayName: string;
  fullName: string;
  phone: string;
  role: string;
  roleLabel: string;
  balanceIls: number;
  totalTopupIls: number;
  totalChargeIls: number;
  dateJoined: string;
}

export const balanceAdminService = {
  async listUsers(params?: { q?: string; role?: string }): Promise<{
    users: BalanceUser[];
    count: number;
  }> {
    const { data } = await api.get<{ users: BalanceUser[]; count: number }>(
      "/admin/balance/users/",
      { params },
    );
    return data;
  },

  async getUser(userId: number): Promise<BalanceUser> {
    const { data } = await api.get<BalanceUser>(`/admin/balance/users/${userId}/`);
    return data;
  },

  async setBalance(
    userId: number,
    balanceIls: number,
    note?: string,
  ): Promise<{ user: BalanceUser; deltaIls: number; detail: string }> {
    const { data } = await api.patch<{
      user: BalanceUser;
      deltaIls: number;
      detail: string;
    }>(`/admin/balance/users/${userId}/`, { balance_ils: balanceIls, note });
    return data;
  },

  async adjustBalance(
    userId: number,
    adjustIls: number,
    note?: string,
  ): Promise<{ user: BalanceUser; deltaIls: number; detail: string }> {
    const { data } = await api.patch<{
      user: BalanceUser;
      deltaIls: number;
      detail: string;
    }>(`/admin/balance/users/${userId}/`, { adjust_ils: adjustIls, note });
    return data;
  },
};
