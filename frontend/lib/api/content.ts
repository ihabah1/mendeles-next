/**
 * Content service — orders and other customer-facing resources exposed by
 * the Django API. Acts as the "products/content" service layer requested
 * for the integration; extend with new resources as the API grows.
 */
import api from "./client";
import type { Order, Paginated } from "./types";

export const contentService = {
  orders: {
    async list(params?: Record<string, string | number>): Promise<Paginated<Order>> {
      const { data } = await api.get<Paginated<Order>>("/orders/", { params });
      return data;
    },
    async retrieve(id: number): Promise<Order> {
      const { data } = await api.get<Order>(`/orders/${id}/`);
      return data;
    },
    async create(payload: Partial<Order>): Promise<Order> {
      const { data } = await api.post<Order>("/orders/", payload);
      return data;
    },
    async update(id: number, patch: Partial<Order>): Promise<Order> {
      const { data } = await api.patch<Order>(`/orders/${id}/`, patch);
      return data;
    },
    async openScanPdf(orderId: number): Promise<void> {
      const { data } = await api.get<Blob>(`/orders/${orderId}/scan/`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(data);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
  },
};
