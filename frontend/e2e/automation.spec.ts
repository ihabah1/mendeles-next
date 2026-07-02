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

test.describe("Automation Center E2E", () => {
  test("automation dashboard loads for admin", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard/automation");
    await expect(page.getByRole("heading", { level: 1, name: /automation|אוטומציה/i })).toBeVisible();
    await expect(page.getByText(/no automation jobs|עדיין לא נוצרו משימות/i)).toBeVisible();
  });
});
