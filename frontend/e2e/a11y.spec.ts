import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  allAdminAuditPaths,
  allPublicAuditPaths,
  localizedAuditPaths,
  localizePath,
} from "@/lib/a11y/audit-routes";

const email = process.env.E2E_EMAIL || "admin@admin.com";
const password = process.env.E2E_PASSWORD || "admin";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/email|אימייל/i).fill(email);
  await page.getByLabel(/password|סיסמה/i).fill(password);
  await page.getByRole("button", { name: /log in|התחברות/i }).click();
  await page.waitForURL("**/dashboard**", { timeout: 15000 });
}

async function expectNoSeriousViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();

  const blocking = results.violations.filter((v) => ["serious", "critical"].includes(v.impact || ""));
  expect(blocking, formatViolations(blocking)).toEqual([]);
}

async function expectAccessibilityShell(page: import("@playwright/test").Page) {
  await expect(page.locator('[data-a11y-widget="toggle"]')).toBeVisible();
  await expect(page.locator('a.skip-link[href="#main-content"]')).toBeAttached();
  await expect(page.locator("main#main-content")).toBeVisible();
}

const PUBLIC_PATHS_HE = localizedAuditPaths("he", allPublicAuditPaths());
const PUBLIC_PATHS_EN = localizedAuditPaths("en", allPublicAuditPaths());

for (const path of PUBLIC_PATHS_HE) {
  test.describe(`axe HE public: ${path}`, () => {
    test("has no serious or critical violations", async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expectNoSeriousViolations(page);
    });

    test("includes accessibility widget and landmarks", async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      await expectAccessibilityShell(page);
    });
  });
}

for (const path of PUBLIC_PATHS_EN) {
  test.describe(`axe EN public: ${path}`, () => {
    test("includes accessibility widget and landmarks", async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      await expectAccessibilityShell(page);
    });
  });
}

test.describe("axe: dashboard admin pages", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  for (const adminPath of allAdminAuditPaths()) {
    test(`admin page ${adminPath} is accessible`, async ({ page }) => {
      await page.goto(adminPath);
      await page.waitForLoadState("networkidle");
      await expectAccessibilityShell(page);
      await expectNoSeriousViolations(page);
    });
  }
});

test.describe("keyboard navigation", () => {
  test("skip link focuses main content on homepage", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: /skip to main|דלג לתוכן/i });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("accessibility widget opens and closes with keyboard", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: /accessibility|נגישות/i });
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test("login form is keyboard reachable", async ({ page }) => {
    await page.goto("/login");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const emailField = page.getByLabel(/email|אימייל/i);
    await expect(emailField).toBeFocused();
  });
});

test.describe("responsive behavior", () => {
  test("accessibility widget visible on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.getByRole("button", { name: /accessibility|נגישות/i })).toBeVisible();
  });

  test("mobile navigation toggle is keyboard accessible", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const menu = page.locator('[aria-controls="mobile-nav-panel"]');
    await menu.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("navigation", { name: /navigation|ניווט/i })).toBeVisible();
  });
});

test.describe("screen reader semantics", () => {
  test("accessibility statement has single h1 and landmark structure", async ({ page }) => {
    await page.goto("/accessibility");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator("main#main-content")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: /accessibility statement|הצהרת נגישות/i })).toBeVisible();
  });

  test("promo videos expose titles and descriptions", async ({ page }) => {
    await page.goto("/#how-it-works");
    const videos = page.locator("video[aria-labelledby][aria-describedby]");
    await expect(videos.first()).toBeVisible();
    expect(await videos.count()).toBeGreaterThanOrEqual(1);
  });
});

test.describe("localized EN homepage", () => {
  test("English homepage includes accessibility shell", async ({ page }) => {
    await page.goto(localizePath("/", "en"));
    await expectAccessibilityShell(page);
  });
});

function formatViolations(violations: { id: string; impact: string | null; description: string; nodes: unknown[] }[]) {
  return violations
    .map((v) => `${v.id} (${v.impact}): ${v.description} — ${v.nodes.length} node(s)`)
    .join("\n");
}
