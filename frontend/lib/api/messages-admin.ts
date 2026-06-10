/** Staff message management — customer inbox compose + AI text fix. */
import api from "./client";

export type InboxChannel = "system" | "sms" | "email" | "push";

export type AiTextMode =
  | "polish"
  | "shorten"
  | "formal"
  | "fix_grammar"
  | "subject"
  | "expand";

export type AiTextField = "subject" | "body" | "both";

export interface MessagesUser {
  id: number;
  email: string;
  displayName: string;
  fullName: string;
  phone: string;
  role: string;
  roleLabel: string;
  dateJoined: string;
  messageCount: number;
  unreadCount: number;
  lastMessageAt: string | null;
  lastSubject: string;
}

export interface AdminMessage {
  id: number;
  channel: InboxChannel;
  channelLabel: string;
  subject: string;
  body: string;
  sentAt: string;
  isRead: boolean;
}

export interface AiTextFixResult {
  subject: string;
  body: string;
  source: "gemini" | "local";
  notice?: string;
}

export const messagesAdminService = {
  async listUsers(params?: { q?: string; role?: string }): Promise<{
    users: MessagesUser[];
    count: number;
  }> {
    const { data } = await api.get<{ users: MessagesUser[]; count: number }>(
      "/admin/messages/users/",
      { params },
    );
    return data;
  },

  async getUser(userId: number): Promise<{ user: MessagesUser; messages: AdminMessage[] }> {
    const { data } = await api.get<{ user: MessagesUser; messages: AdminMessage[] }>(
      `/admin/messages/users/${userId}/`,
    );
    return data;
  },

  async sendMessage(
    userId: number,
    payload: { subject: string; body: string; channel?: InboxChannel },
  ): Promise<{ message: AdminMessage; user: MessagesUser; detail: string }> {
    const { data } = await api.post<{
      message: AdminMessage;
      user: MessagesUser;
      detail: string;
    }>(`/admin/messages/users/${userId}/`, payload);
    return data;
  },

  async aiTextFix(payload: {
    subject?: string;
    body?: string;
    mode: AiTextMode;
    field?: AiTextField;
  }): Promise<AiTextFixResult> {
    const { data } = await api.post<AiTextFixResult>("/admin/ai/text-fix/", payload);
    return data;
  },
};
