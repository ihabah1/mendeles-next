/** Users service — admin-only user management via the Django API. */
import api from "./client";
import type { ApiUser, Paginated } from "./types";

const BASE = "/users/";

export const usersService = {
  async list(params?: Record<string, string | number>): Promise<Paginated<ApiUser>> {
    const { data } = await api.get<Paginated<ApiUser>>(BASE, { params });
    return data;
  },

  async retrieve(id: number): Promise<ApiUser> {
    const { data } = await api.get<ApiUser>(`${BASE}${id}/`);
    return data;
  },

  async update(id: number, patch: Partial<ApiUser>): Promise<ApiUser> {
    const { data } = await api.patch<ApiUser>(`${BASE}${id}/`, patch);
    return data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`${BASE}${id}/`);
  },
};
