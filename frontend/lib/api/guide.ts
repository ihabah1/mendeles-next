import api from "./client";
import { matchGuideLocally, type GuideLink } from "@/lib/site-guide";

export interface GuideReply {
  text: string;
  links: GuideLink[];
  source?: string;
}

export const guideService = {
  async chat(message: string): Promise<GuideReply> {
    try {
      const { data } = await api.post<GuideReply>("/guide/chat/", { message });
      return data;
    } catch {
      return { ...matchGuideLocally(message), source: "local" };
    }
  },
};
