import { test, expect } from "@playwright/test";

const email = process.env.E2E_EMAIL || "admin@admin.com";
const password = process.env.E2E_PASSWORD || "admin";

test.describe("Phase 1 E2E", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByLabel(/email|אימייל/i)).toBeVisible();
  });

  test("register page loads", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByLabel(/email|אימייל/i)).toBeVisible();
  });

  test("login and open dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email|אימייל/i).fill(email);
    await page.getByLabel(/password|סיסמה/i).fill(password);
    await page.getByRole("button", { name: /log in|התחברות/i }).click();
    await page.waitForURL("**/dashboard**", { timeout: 15000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("user management page loads for admin", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email|אימייל/i).fill(email);
    await page.getByLabel(/password|סיסמה/i).fill(password);
    await page.getByRole("button", { name: /log in|התחברות/i }).click();
    await page.waitForURL("**/dashboard**", { timeout: 15000 });
    await page.goto("/dashboard/users");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
