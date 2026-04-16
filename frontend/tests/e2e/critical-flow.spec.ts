import { test, expect } from "@playwright/test";

test("signup → play → generate → library → logout", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  // 1. landing
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Background music/i })).toBeVisible();

  // 2. → signup
  await page.getByRole("link", { name: /Get started/i }).click();
  await expect(page).toHaveURL(/\/signup$/);

  // 3. fill form & submit
  await page.getByLabel("Name").fill("E2E User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: /Create account/i }).click();

  // 4. expect redirect to /app/dashboard
  await expect(page).toHaveURL(/\/app\/dashboard$/, { timeout: 10_000 });
  await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();

  // 5. sidebar → Play
  await page.getByRole("link", { name: "Play" }).click();
  await expect(page).toHaveURL(/\/app\/play$/);

  // 6. fill prompt + Generate
  await page.getByLabel("Prompt").fill("e2e lofi seamless");
  await page.getByRole("button", { name: /Generate music/i }).click();

  // 7. MiniPlayer should show a track
  await expect(page.locator("text=Nothing playing")).toHaveCount(0, { timeout: 10_000 });

  // 8. → Library
  await page.getByRole("link", { name: "Library" }).click();
  await expect(page).toHaveURL(/\/app\/library$/);

  // 9. logout via user menu
  await page.locator("button").filter({ hasText: email.slice(0, 1).toUpperCase() }).click();
  await page.getByRole("menuitem", { name: /Sign out/i }).click();
  await expect(page).toHaveURL(/^http:\/\/localhost:3000\/$/);
});
