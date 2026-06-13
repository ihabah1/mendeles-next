import api from "./client";

export interface MonitoringSnapshot {
  generatedAt: string;
  users: { total: number; newToday: number; activeStaff: number };
  traffic: {
    pageViewsToday: number;
    uniqueVisitorsToday: number;
    ordersToday: number;
    chatSessionsToday: number;
    daily: Array<{
      date: string;
      pageViews: number;
      uniqueVisitors: number;
      orders: number;
      newUsers: number;
      chatSessions: number;
    }>;
  };
  business: { totalRevenueIls: number; totalOrders: number };
  comboPool: { total: number; used: number; free: number; percentUsed: number };
  files: Array<{ name: string; path: string; exists: boolean; sizeMb: number | null }>;
  services: Array<{
    key: string;
    label: string;
    configured?: boolean;
    hint?: string | null;
  }>;
  draw: { lotteryId?: number; date?: string };
  automation: {
    lastRunAt: string | null;
    lastStatus: string | null;
    lastMessage: string | null;
    logs: AutomationLogRow[];
  };
  integrations: Array<{
    id: number;
    source: string;
    level: string;
    message: string;
    createdAt: string;
  }>;
  chatInquiriesOpen: number;
}

export interface AutomationLogRow {
  id: number;
  job: string;
  level: string;
  message: string;
  details: Record<string, unknown>;
  durationMs: number | null;
  createdAt: string;
}

export interface ChatInquiry {
  id: number;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  pagePath: string;
  ipAddress: string | null;
  messages: Array<{ role: string; text: string; at?: string }>;
  aiSummary: string;
  escalated: boolean;
}

export const monitoringAdminService = {
  async snapshot(): Promise<MonitoringSnapshot> {
    const { data } = await api.get<MonitoringSnapshot>("/admin/monitoring/");
    return data;
  },

  async runDailySync(): Promise<{ detail: string; snapshot: MonitoringSnapshot }> {
    const { data } = await api.post<{ detail: string; snapshot: MonitoringSnapshot }>(
      "/admin/monitoring/run-daily-sync/",
    );
    return data;
  },

  async chatInquiries(limit = 40): Promise<ChatInquiry[]> {
    const { data } = await api.get<{ inquiries: ChatInquiry[] }>("/admin/chat-inquiries/", {
      params: { limit },
    });
    return data.inquiries;
  },
};

export async function metricsPing(visitorId: string): Promise<void> {
  try {
    await api.post("/metrics/ping/", { visitor_id: visitorId });
  } catch {
    /* ignore */
  }
}
