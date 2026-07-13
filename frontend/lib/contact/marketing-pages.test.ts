import { describe, expect, it } from "vitest";
import { isMarketingPage } from "@/lib/contact/marketing-pages";

describe("isMarketingPage", () => {
  it("allows public marketing routes", () => {
    expect(isMarketingPage("/")).toBe(true);
    expect(isMarketingPage("/blog")).toBe(true);
    expect(isMarketingPage("/solutions/seo")).toBe(true);
    expect(isMarketingPage("/company")).toBe(true);
  });

  it("blocks dashboard and auth routes", () => {
    expect(isMarketingPage("/dashboard")).toBe(false);
    expect(isMarketingPage("/dashboard/whatsapp")).toBe(false);
    expect(isMarketingPage("/login")).toBe(false);
    expect(isMarketingPage("/register")).toBe(false);
    expect(isMarketingPage("/forgot-password")).toBe(false);
    expect(isMarketingPage("/verify-email")).toBe(false);
  });
});
