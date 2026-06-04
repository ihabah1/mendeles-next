/** Lotto service — sets, submit, subscribe via Django API. */
import api from "./client";

export interface LottoSetRow {
  set_index: number;
  n1: number;
  n2: number;
  n3: number;
  n4: number;
  n5: number;
  n6: number;
  strong: number;
  draw_date?: string;
  display?: string;
}

export interface MySetsResponse {
  sets: LottoSetRow[];
  count: number;
  tier: "premium" | "registered";
}

export interface SubmitSetPayload {
  set_index?: number;
  n1: number;
  n2: number;
  n3: number;
  n4: number;
  n5: number;
  n6: number;
  strong: number | null;
}

export interface SubmitResponse {
  status: string;
  order_number: string;
  tables_count: number;
  total_ils: number;
  message: string;
}

export interface PrintTablePayload {
  number: number;
  numbers: number[];
  strong: number;
}

export interface PrintSummaryResponse {
  detail: string;
  print_response?: Record<string, unknown>;
}

export const lottoService = {
  async mySets(drawDate?: string): Promise<MySetsResponse> {
    const { data } = await api.get<MySetsResponse>("/lotto/my-sets/", {
      params: drawDate ? { draw_date: drawDate } : undefined,
    });
    return data;
  },

  async submit(payload: {
    sets: SubmitSetPayload[];
    draw_date?: string;
    is_double?: boolean;
  }): Promise<SubmitResponse> {
    const { data } = await api.post<SubmitResponse>("/lotto/submit/", payload);
    return data;
  },

  async subscribe(payload: {
    plan: "weekly" | "monthly";
    draw_date?: string;
  }): Promise<{ status: string; sets_count: number; expires_at: string; plan: string; draw_date: string }> {
    const { data } = await api.post("/lotto/subscribe/", payload);
    return data;
  },

  async printSummary(payload: {
    tables: PrintTablePayload[];
    order_id?: number;
  }): Promise<PrintSummaryResponse> {
    const { data } = await api.post<PrintSummaryResponse>("/lotto/print/", payload);
    return data;
  },
};
