import api from "./client";

export interface DrawPrize {
  name: string;
  ils: number;
  winners: number;
}

export interface DrawSnapshot {
  lotteryId?: number;
  date?: string;
  numbers: number[];
  strong?: number;
  updatedAt?: string;
  jackpotIls: number;
  jackpotWinners: number;
  prizes: Record<string, DrawPrize>;
  nextDraw: {
    date: string | null;
    time: string;
    dayName: string | null;
    at: string | null;
  };
  sourceFile: string;
}

export interface AutomationSource {
  key: string;
  label: string;
  role?: string;
  name?: string;
  path: string;
  exists: boolean;
  sizeMb: number | null;
  updatedAt?: string | null;
  rowCount?: number | null;
  addedRecently?: number | null;
  pendingImport?: boolean;
}

export interface ComboJsonStats {
  exists: boolean;
  path: string | null;
  objectCount: number | null;
  sizeMb: number | null;
  updatedAt: string | null;
  addedRecently: number | null;
  pendingImport?: boolean;
  lastImportedAt?: string | null;
  lastImportedCount?: number | null;
  addedSinceLastImport?: number | null;
}

export interface AutomationRun {
  id: number;
  at: string;
  success: boolean;
  level: string;
  message: string;
  durationMs: number | null;
  recordsWritten: number;
  combos: { total?: number; used?: number; free?: number };
  drawLotteryId?: number;
}

export interface AutomationSnapshot {
  warning?: string;
  paisFetchVersion?: number;
  schedule: {
    cron: string;
    cronLabel: string;
    command: string;
    nextRunAt: string;
    nextRunAtLocal: string;
  };
  sources: AutomationSource[];
  lastDailySync: {
    at: string | null;
    success: boolean;
    level: string | null;
    message: string | null;
    durationMs: number | null;
    recordsWritten: number;
    csvTotalRows: number | null;
    combos: { total?: number; used?: number; free?: number };
    drawLotteryId?: number;
  };
  stats: { totalRuns: number; successCount: number; failCount: number };
  runs: AutomationRun[];
  lastRunAt: string | null;
  lastStatus: string | null;
  lastMessage: string | null;
  logs: AutomationLogRow[];
}

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
  comboPool: {
    total: number;
    used: number;
    free: number;
    percentUsed: number;
    json?: ComboJsonStats;
  };
  files: Array<{
    name: string;
    path: string;
    exists: boolean;
    sizeMb: number | null;
    updatedAt?: string | null;
    rowCount?: number | null;
    addedRecently?: number | null;
  }>;
  services: Array<{
    key: string;
    label: string;
    configured?: boolean;
    hint?: string | null;
  }>;
  draw: DrawSnapshot;
  automation: AutomationSnapshot;
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
  jobLabel?: string;
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

export interface DailySyncResult {
  detail: string;
  stdout?: string;
  stderr?: string;
  logs?: string[];
  durationMs?: number;
  startedAt?: string;
  snapshot?: MonitoringSnapshot | null;
}

export function linesFromSyncPayload(data: {
  logs?: string[];
  stdout?: string;
  stderr?: string;
  detail?: string;
}): string[] {
  if (data.logs?.length) return data.logs;
  const lines: string[] = [];
  if (data.stdout?.trim()) lines.push(...data.stdout.trim().split(/\r?\n/));
  if (data.stderr?.trim()) lines.push(...data.stderr.trim().split(/\r?\n/));
  return lines;
}

export const monitoringAdminService = {
  async snapshot(): Promise<MonitoringSnapshot> {
    const { data } = await api.get<MonitoringSnapshot>("/admin/monitoring/");
    return data;
  },

  async runDailySync(): Promise<DailySyncResult> {
    const { data } = await api.post<DailySyncResult>(
      "/admin/monitoring/run-daily-sync/",
      {},
      { timeout: 300_000 },
    );
    return {
      ...data,
      logs: linesFromSyncPayload(data),
    };
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
