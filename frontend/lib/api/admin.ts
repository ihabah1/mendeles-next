/** Admin dashboard service — staff-only endpoints on the Django API. */
import api from "./client";
import type { UiOrder } from "./mappers";

export interface AdminStats {
  total_users: number;
  new_today: number;
  active_subs: number;
  pending_orders: number;
  total_revenue: number;
  total_wins: number;
  total_prize: number;
}

export const adminService = {
  async stats(): Promise<AdminStats> {
    const { data } = await api.get<AdminStats>("/admin/stats/");
    return data;
  },

  async orders(status?: string): Promise<{ orders: UiOrder[]; count: number }> {
    const { data } = await api.get<{ orders: UiOrder[]; count: number }>(
      "/admin/orders/",
      { params: status ? { status } : undefined },
    );
    return data;
  },

  async updateOrderStatus(orderId: number, status: string): Promise<void> {
    await api.patch("/admin/orders/", { order_id: orderId, status });
  },
};
