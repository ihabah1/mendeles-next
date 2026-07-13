import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { WhatsAppChatWidget } from "@/components/contact/whatsapp-chat-widget";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      title: "Mendeles",
      subtitle: "AI assistant",
      welcome: "Hi! Welcome to Mendeles.",
      notConnected: "WhatsApp is not connected yet.",
      close: "Close chat",
      inputLabel: "Message",
      inputPlaceholder: "Type a message…",
      send: "Send",
    };
    return map[key] ?? key;
  },
}));

vi.mock("@/lib/api/whatsapp", () => ({
  fetchWhatsAppPublicStatus: vi.fn().mockResolvedValue({
    connected: false,
    provider: "evolution",
    message: "WhatsApp is not connected yet.",
  }),
}));

describe("WhatsAppChatWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders welcome and not-connected status when open", () => {
    render(<WhatsAppChatWidget open onClose={() => {}} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Hi! Welcome to Mendeles.")).toBeInTheDocument();
    expect(screen.getAllByText("WhatsApp is not connected yet.").length).toBeGreaterThan(0);
  });

  it("does not render when closed", () => {
    render(<WhatsAppChatWidget open={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("sends a user message and shows status reply", () => {
    render(<WhatsAppChatWidget open onClose={() => {}} />);
    const input = screen.getByPlaceholderText("Type a message…");
    fireEvent.change(input, { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<WhatsAppChatWidget open onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close chat"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
