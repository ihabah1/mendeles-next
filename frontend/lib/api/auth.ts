/** Authentication service — talks to the Django simplejwt endpoints. */
import api from "./client";
import { AUTH_ENDPOINTS } from "./config";
import { tokenStore } from "./tokens";
import type {
  ApiUser,
  LoginResponse,
  RegisterPayload,
  RegisterResponse,
  VerifyEmailResponse,
  FirebaseVerifyPhoneResponse,
  VerifyPhoneResponse,
} from "./types";

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>(AUTH_ENDPOINTS.login, {
      email,
      password,
    });
    tokenStore.set(data.access, data.refresh);
    return data;
  },

  async register(payload: RegisterPayload): Promise<RegisterResponse> {
    const { data } = await api.post<RegisterResponse>(
      AUTH_ENDPOINTS.register,
      payload,
    );
    return data;
  },

  async verifyEmail(token: string): Promise<VerifyEmailResponse> {
    const { data } = await api.post<VerifyEmailResponse>(
      AUTH_ENDPOINTS.verifyEmail,
      { token },
    );
    if (data.access && data.refresh) {
      tokenStore.set(data.access, data.refresh);
    }
    return data;
  },

  async resendVerification(email: string): Promise<{ detail: string }> {
    const { data } = await api.post<{ detail: string }>(
      AUTH_ENDPOINTS.resendVerification,
      { email },
    );
    return data;
  },

  async verifyPhone(email: string, code: string): Promise<VerifyPhoneResponse> {
    const { data } = await api.post<VerifyPhoneResponse>(
      AUTH_ENDPOINTS.verifyPhone,
      { email, code },
    );
    tokenStore.set(data.access, data.refresh);
    return data;
  },

  async resendPhoneOtp(email: string): Promise<{ detail: string }> {
    const { data } = await api.post<{ detail: string }>(
      AUTH_ENDPOINTS.resendPhoneOtp,
      { email },
    );
    return data;
  },

  async verifyFirebasePhone(firebaseToken: string): Promise<FirebaseVerifyPhoneResponse> {
    const { data } = await api.post<FirebaseVerifyPhoneResponse>(
      AUTH_ENDPOINTS.firebaseVerifyPhone,
      { firebase_token: firebaseToken },
    );
    if (data.access && data.refresh) {
      tokenStore.set(data.access, data.refresh);
    }
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

  async changePassword(
    current_password: string,
    new_password: string,
  ): Promise<{ detail: string }> {
    const { data } = await api.post<{ detail: string }>(
      AUTH_ENDPOINTS.changePassword,
      { current_password, new_password },
    );
    return data;
  },
};
