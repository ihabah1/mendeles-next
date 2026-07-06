import { test, expect } from "@playwright/test";

test.describe("Register smoke", () => {
  test("register form submits successfully", async ({ page }) => {
    const email = `smoke-${Date.now()}@test.mendeles.local`;
    await page.goto("/register");
    await page.getByLabel(/שם העסק|business/i).fill("Smoke Test Org");
    await page.getByLabel(/שם פרטי|first name/i).fill("Smoke");
    await page.getByLabel(/שם משפחה|last name/i).fill("Tester");
    await page.getByLabel(/אימייל|email/i).fill(email);
    await page.getByLabel(/^סיסמה$|^password$/i).fill("SecurePass123!");
    await page.getByRole("button", { name: /sign up|הרשמה|register/i }).click();
    await expect(page.getByText("ההרשמה הצליחה")).toBeVisible({ timeout: 20000 });
  });
});
