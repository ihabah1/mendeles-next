/** Print queue admin API — staff-only. */
import api from "./client";

export interface PrintQueueTable {
  setIndex: number;
  numbers: number[];
  strong: number;
  display?: string;
}

export interface PrintQueueForm {
  formIndex: number;
  tables: PrintQueueTable[];
}

export interface PrintQueueJob {
  id: number;
  orderId: number;
  orderNumber: string;
  status: string;
  priority: number;
  printMode?: string;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  tablesCount: number;
  formsCount: number;
  totalIls: number;
  drawDate: string;
  isDouble: boolean;
  lotteryId?: number | null;
  orderStatus: string;
  claimedByAgent: string | null;
  approvedAt: string | null;
  claimedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  orderCreatedAt: string;
  orderPrintedAt: string | null;
  orderScannedAt: string | null;
  hasScan: boolean;
  sets: PrintQueueTable[];
  forms: PrintQueueForm[];
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

export interface PrintControlConfig {
  apiKeyConfigured: boolean;
  apiKeyHint: string | null;
  apiKeyHeader: string;
  payloadMode: string;
  payloadModes: Array<{ value: string; label: string }>;
  printServerConfigured: boolean;
  autoEnqueue: boolean;
  agentEndpoints: {
    heartbeat: string;
    pull: string;
    confirm: string;
    fail: string;
  };
  configFileExample: Record<string, string | number>;
}

export interface PrintQueueResponse {
  jobs: PrintQueueJob[];
  count: number;
  counts: Record<string, number>;
  agents: PrintAgentInfo[];
  anyAgentOnline: boolean;
  canStartPrinting: boolean;
  printerStatus: PrinterStatus;
  printConfig?: PrintControlConfig;
}

export const printQueueService = {
  async list(params?: {
    status?: string;
    q?: string;
    has_scan?: boolean;
    has_invoice?: boolean;
  }): Promise<PrintQueueResponse> {
    const query: Record<string, string> = {};
    if (params?.status) query.status = params.status;
    if (params?.q?.trim()) query.q = params.q.trim();
    if (params?.has_scan === true) query.has_scan = "true";
    if (params?.has_scan === false) query.has_scan = "false";
    if (params?.has_invoice === true) query.has_invoice = "true";
    if (params?.has_invoice === false) query.has_invoice = "false";
    const { data } = await api.get<PrintQueueResponse>("/admin/print-queue/", {
      params: Object.keys(query).length ? query : undefined,
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

  async skipStep(
    jobId: number,
    step: "approve" | "claim" | "print" | "scan",
  ): Promise<{ detail: string; job: PrintQueueJob }> {
    const { data } = await api.post<{ detail: string; job: PrintQueueJob }>(
      `/admin/print-queue/${jobId}/skip/`,
      { step },
    );
    return data;
  },

  async skipToScan(jobId: number): Promise<{ detail: string; job: PrintQueueJob }> {
    return this.skipStep(jobId, "print");
  },

  async promote(jobId: number): Promise<{ detail: string; job: PrintQueueJob }> {
    const { data } = await api.post<{ detail: string; job: PrintQueueJob }>(
      `/admin/print-queue/${jobId}/promote/`,
    );
    return data;
  },

  async setPriority(jobId: number, priority: number): Promise<PrintQueueJob> {
    const { data } = await api.post<{ job: PrintQueueJob }>(
      `/admin/print-queue/${jobId}/priority/`,
      { priority },
    );
    return data.job;
  },

  async send(
    jobId: number,
    printMode?: string,
  ): Promise<{ detail: string; job: PrintQueueJob }> {
    const { data } = await api.post<{ detail: string; job: PrintQueueJob }>(
      `/admin/print-queue/${jobId}/send/`,
      printMode ? { printMode } : {},
    );
    return data;
  },

  async enqueueByOrderNumber(orderNumber: string): Promise<{ detail: string; job: PrintQueueJob }> {
    const { data } = await api.post<{ detail: string; job: PrintQueueJob }>(
      "/admin/print-queue/enqueue-by-number/",
      { orderNumber },
    );
    return data;
  },

  async verifyApiKey(apiKey: string): Promise<{ valid: boolean; detail: string }> {
    const { data } = await api.post<{ valid: boolean; detail: string }>(
      "/admin/print-queue/verify-api-key/",
      { apiKey },
    );
    return data;
  },

  async registerAgent(params: {
    agentId?: string;
    hostname?: string;
    printerReady?: boolean;
    printerMessage?: string;
  }): Promise<{ detail: string }> {
    const { data } = await api.post<{ detail: string }>(
      "/admin/print-queue/register-agent/",
      params,
    );
    return data;
  },
};
