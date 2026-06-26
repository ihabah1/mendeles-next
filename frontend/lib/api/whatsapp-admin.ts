import api from "./client";

export interface WhatsAppStatus {
  enabled: boolean;
  configured: boolean;
  twilio: boolean;
  whatsappFrom: string | null;
  gemini: boolean;
  hint: string | null;
}

export interface WhatsAppSetup {
  webhookUrl: string;
  frontendUrl: string;
  status: WhatsAppStatus;
  twilioConsole: string;
  steps: string[];
}

export const whatsappAdminApi = {
  async status(): Promise<WhatsAppStatus> {
    const { data } = await api.get<WhatsAppStatus>("/whatsapp/status/");
    return data;
  },

  async setup(): Promise<WhatsAppSetup> {
    const { data } = await api.get<WhatsAppSetup>("/whatsapp/setup/");
    return data;
  },

  async simulate(payload: {
    message: string;
    from?: string;
  }): Promise<{ reply: string; from: string }> {
    const { data } = await api.post<{ reply: string; from: string }>(
      "/whatsapp/simulate/",
      payload,
    );
    return data;
  },
};
