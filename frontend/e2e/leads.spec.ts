import { test, expect } from "@playwright/test";

const email = process.env.E2E_EMAIL || "admin@admin.com";
const password = process.env.E2E_PASSWORD || "admin";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/email|אימייל/i).fill(email);
  await page.getByLabel(/password|סיסמה/i).fill(password);
  await page.getByRole("button", { name: /log in|התחברות/i }).click();
  await page.waitForURL("**/dashboard**", { timeout: 15000 });
}

test.describe("Phase 4 Leads E2E", () => {
  test("leads dashboard loads for admin", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard/leads");
    await expect(page.getByRole("heading", { level: 1, name: /leads|לידים/i })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("leads search form is keyboard accessible", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard/leads");
    const search = page.getByLabel(/search|חיפוש/i);
    await search.focus();
    await expect(search).toBeFocused();
  });
});
