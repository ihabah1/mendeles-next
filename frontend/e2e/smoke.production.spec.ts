import { expect, test } from "@playwright/test";

const backendUrl =
  process.env.BACKEND_URL?.replace(/\/$/, "") ||
  "https://eloquent-perfection-production-de3d.up.railway.app";

const adminEmail = process.env.TEST_ADMIN_EMAIL || "admin@admin.com";
const adminPassword = process.env.TEST_ADMIN_PASSWORD || "admin";

test.describe("Production smoke — API", () => {
  test("backend root responds", async ({ request }) => {
    const res = await request.get(`${backendUrl}/`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.service).toContain("Mandeles");
  });

  test("frontend runtime-config is configured", async ({ request }) => {
    const res = await request.get("/api/runtime-config");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.configured).toBe(true);
    expect(body.backendReachable).toBe(true);
    expect(String(body.apiBaseUrl)).toContain("railway.app");
  });

  test("backend login returns JWT", async ({ request }) => {
    const res = await request.post(`${backendUrl}/api/auth/login/`, {
      data: { email: adminEmail, password: adminPassword },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.access).toBeTruthy();
    expect(body.refresh).toBeTruthy();
    expect(body.user?.email).toBe(adminEmail);
  });

  test("frontend django-api proxy login works", async ({ request }) => {
    const res = await request.post("/django-api/auth/login/", {
      data: { email: adminEmail, password: adminPassword },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.access).toBeTruthy();
    expect(body.user?.email).toBe(adminEmail);
  });
});

test.describe("Production smoke — UI", () => {
  test("homepage loads", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.ok()).toBeTruthy();
    await expect(page.locator("body")).toContainText("Mandeles");
  });

  test("auth page loads", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByRole("heading", { name: /כניסה/ })).toBeVisible();
    await expect(page.getByPlaceholder("אימייל")).toBeVisible();
    await expect(page.getByPlaceholder("סיסמה")).toBeVisible();
  });

  test("admin can log in via UI", async ({ page }) => {
    await page.goto("/auth");
    await page.getByPlaceholder("אימייל").fill(adminEmail);
    await page.getByPlaceholder("סיסמה").fill(adminPassword);
    await page.getByRole("button", { name: "כניסה", exact: true }).click();
    await page.waitForURL(/\/(lotto|profile|admin)/, { timeout: 15_000 });
    expect(page.url()).not.toContain("/auth");
  });
});
