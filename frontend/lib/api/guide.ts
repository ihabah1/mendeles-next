import api from "./client";
import { matchGuideLocally, type GuideLink } from "@/lib/site-guide";

export interface GuideChatMessage {
  role: "user" | "assistant";
  text: string;
}

export interface GuideReply {
  text: string;
  links: GuideLink[];
  source?: string;
  escalated?: boolean;
}

export const guideService = {
  async chat(
    message: string,
    opts?: {
      history?: GuideChatMessage[];
      pagePath?: string;
      guestName?: string;
      alreadyEscalated?: boolean;
      sessionId?: string;
    },
  ): Promise<GuideReply> {
    try {
      const { data } = await api.post<GuideReply>("/guide/chat/", {
        message,
        history: opts?.history ?? [],
        page_path: opts?.pagePath ?? "",
        guest_name: opts?.guestName ?? "",
        already_escalated: opts?.alreadyEscalated ?? false,
        session_id: opts?.sessionId ?? "",
      });
      return data;
    } catch {
      return { ...matchGuideLocally(message), source: "local", escalated: false };
    }
  },
};
