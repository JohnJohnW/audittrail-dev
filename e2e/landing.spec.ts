import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("should display the hero section", async ({ page }) => {
    await page.goto("/");

    // Check for the main heading
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Check for the CTA button
    await expect(
      page.getByRole("link", { name: "Get Started", exact: true }).first()
    ).toBeVisible();
  });

  test("should navigate to sign in page", async ({ page }) => {
    await page.goto("/");

    // Click on Get Started link (navigates to /auth/signin)
    await page.getByRole("link", { name: "Get Started", exact: true }).first().click();

    // Should be on sign in page
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test("should display pricing section", async ({ page }) => {
    await page.goto("/");

    // Scroll to pricing section
    await page
      .getByText(/pricing/i)
      .first()
      .click();

    // Check for pricing plans
    await expect(page.getByRole("heading", { name: "Free", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pro", exact: true })).toBeVisible();
  });

  test("should be responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Hero should still be visible
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
