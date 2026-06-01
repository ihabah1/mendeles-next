/** Authentication service — talks to the Django simplejwt endpoints. */
import api from "./client";
import { AUTH_ENDPOINTS } from "./config";
import { tokenStore } from "./tokens";
import type { ApiUser, LoginResponse, RegisterPayload } from "./types";

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>(AUTH_ENDPOINTS.login, {
      email,
      password,
    });
    tokenStore.set(data.access, data.refresh);
    return data;
  },

  async register(payload: RegisterPayload): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>(
      AUTH_ENDPOINTS.register,
      payload,
    );
    tokenStore.set(data.access, data.refresh);
    return data;
  },

  /** Best-effort logout: blacklist the refresh token, then clear local state. */
  async logout(): Promise<void> {
    const refresh = tokenStore.getRefresh();
    try {
      if (refresh) {
        await api.post(AUTH_ENDPOINTS.logout, { refresh });
      }
    } finally {
      tokenStore.clear();
    }
  },

  async me(): Promise<ApiUser> {
    const { data } = await api.get<ApiUser>(AUTH_ENDPOINTS.me);
    return data;
  },

  async updateMe(patch: Partial<ApiUser>): Promise<ApiUser> {
    const { data } = await api.patch<ApiUser>(AUTH_ENDPOINTS.me, patch);
    return data;
  },
};
