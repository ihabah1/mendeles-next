/** Customer inbox — system messages via Django API. */
import api from "./client";
import type { InboxMessage, Paginated } from "./types";

export const inboxService = {
  async list(): Promise<InboxMessage[]> {
    const { data } = await api.get<Paginated<InboxMessage>>("/messages/");
    return data.results;
  },

  async unreadCount(): Promise<number> {
    const { data } = await api.get<{ unread_count: number }>("/messages/unread_count/");
    return data.unread_count;
  },

  async markRead(id: number): Promise<InboxMessage> {
    const { data } = await api.post<InboxMessage>(`/messages/${id}/mark_read/`);
    return data;
  },

  async markAllRead(): Promise<number> {
    const { data } = await api.post<{ marked_read: number }>("/messages/mark_all_read/");
    return data.marked_read;
  },
};
