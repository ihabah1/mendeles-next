/** Print queue admin API — staff-only. */
import api from "./client";

export interface PrintQueueJob {
  id: number;
  orderId: number;
  orderNumber: string;
  status: string;
  priority: number;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  tablesCount: number;
  totalIls: number;
  drawDate: string;
  orderStatus: string;
  claimedByAgent: string | null;
  approvedAt: string | null;
  claimedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  user?: { name: string; phone?: string; email?: string };
}

export interface PrintAgentInfo {
  agentId: string;
  hostname: string | null;
  version: string | null;
  lastSeenAt: string | null;
  lastSeenSecondsAgo?: number | null;
  online: boolean;
  printerReady?: boolean;
  printerMessage?: string | null;
}

export type PrinterStatusLevel = "ready" | "agent_only" | "offline" | "never_seen";

export interface PrinterStatus {
  level: PrinterStatusLevel;
  message: string;
  canStartPrinting: boolean;
  agentOnline: boolean;
  printerReady: boolean;
  agents: PrintAgentInfo[];
}

export interface PrintQueueResponse {
  jobs: PrintQueueJob[];
  count: number;
  counts: Record<string, number>;
  agents: PrintAgentInfo[];
  anyAgentOnline: boolean;
  canStartPrinting: boolean;
  printerStatus: PrinterStatus;
}

export const printQueueService = {
  async list(status?: string): Promise<PrintQueueResponse> {
    const { data } = await api.get<PrintQueueResponse>("/admin/print-queue/", {
      params: status ? { status } : undefined,
    });
    return data;
  },

  async approve(jobId: number): Promise<PrintQueueJob> {
    const { data } = await api.post<{ job: PrintQueueJob }>(
      `/admin/print-queue/${jobId}/approve/`,
    );
    return data.job;
  },

  async approveBulk(orderIds: number[]): Promise<PrintQueueJob[]> {
    const { data } = await api.post<{ jobs: PrintQueueJob[] }>(
      "/admin/print-queue/approve-bulk/",
      { order_ids: orderIds },
    );
    return data.jobs;
  },

  async retry(jobId: number): Promise<PrintQueueJob> {
    const { data } = await api.post<{ job: PrintQueueJob }>(
      `/admin/print-queue/${jobId}/retry/`,
    );
    return data.job;
  },

  async cancel(jobId: number): Promise<PrintQueueJob> {
    const { data } = await api.post<{ job: PrintQueueJob }>(
      `/admin/print-queue/${jobId}/cancel/`,
    );
    return data.job;
  },

  async enqueue(orderId: number): Promise<PrintQueueJob> {
    const { data } = await api.post<{ job: PrintQueueJob }>(
      `/admin/print-queue/enqueue/${orderId}/`,
    );
    return data.job;
  },
};
