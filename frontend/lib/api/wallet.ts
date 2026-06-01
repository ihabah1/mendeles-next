/** Wallet service — balance, history, topup via Django API. */
import api from "./client";

export interface WalletBalance {
  balance: number;
  currency: string;
}

export interface WalletTransaction {
  id: number;
  type: string;
  amountIls: number;
  description: string;
  createdAt: string;
}

export interface TopupResponse {
  client_secret?: string;
  payment_id: string;
  amount_ils: number;
  balance?: number;
  dev_mode?: boolean;
}

export const walletService = {
  async balance(): Promise<WalletBalance> {
    const { data } = await api.get<WalletBalance>("/wallet/balance/");
    return data;
  },

  async history(): Promise<WalletTransaction[]> {
    const { data } = await api.get<{ transactions: WalletTransaction[] }>(
      "/wallet/history/",
    );
    return data.transactions;
  },

  async topup(amount_ils: number): Promise<TopupResponse> {
    const { data } = await api.post<TopupResponse>("/wallet/topup/", {
      amount_ils,
    });
    return data;
  },
};
