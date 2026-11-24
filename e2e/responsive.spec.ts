import { expect, test, type Page } from "@playwright/test";
import { USERS, loginAs } from "./helpers";

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 900 },
];

const PAGES: { who: keyof typeof USERS | null; path: string; name: string }[] = [
  { who: null, path: "/", name: "home" },
  { who: null, path: "/compare", name: "compare" },
  { who: null, path: "/login", name: "login" },
  { who: "farmer3", path: "/farmer", name: "farmer-dashboard" },
  { who: "farmer3", path: "/farmer/applications", name: "farmer-applications" },
  { who: "farmer3", path: "/notifications", name: "notifications" },
  { who: "gov", path: "/officer", name: "officer-queue" },
  { who: "operator", path: "/operator", name: "operator-home" },
];

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

for (const viewport of VIEWPORTS) {
  test.describe(`layout at ${viewport.name} (${viewport.width}px)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const target of PAGES) {
      test(`${target.name} fits without sideways scrolling`, async ({ page }) => {
        if (target.who) await loginAs(page, USERS[target.who]);
        await page.goto(target.path);
        await expect(page.locator("h1").first()).toBeVisible();
        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
        await page.screenshot({ path: `test-results/screens/${viewport.name}-${target.name}.png`, fullPage: true });
      });
    }

    test("officer workspace and farmer detail fit", async ({ page }) => {
      await loginAs(page, USERS.gov);
      await page.goto("/officer");
      const firstRow = page.getByTestId("application-row").first();
      await firstRow.getByRole("link").first().click();
      await page.waitForURL(/\/officer\/applications\//);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: `test-results/screens/${viewport.name}-officer-workspace.png`, fullPage: true });

      await loginAs(page, USERS.farmer3);
      await page.goto("/farmer/applications");
      await page.getByTestId("application-row").first().getByRole("link").first().click();
      await page.waitForURL(/\/farmer\/applications\/[^/]+$/);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: `test-results/screens/${viewport.name}-farmer-detail.png`, fullPage: true });
    });
  });
}

test("Hindi can be switched on and stays on across pages", async ({ page }) => {
  await loginAs(page, USERS.farmer3);
  await page.goto("/farmer");
  await page.getByRole("button", { name: "हिन्दी" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await page.goto("/compare");
  await expect(page.getByRole("link", { name: "सरकारी योजना से आवेदन करें" }).first()).toBeVisible();
  await page.screenshot({ path: "test-results/screens/hindi-compare.png", fullPage: true });
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("keyboard users can skip to content and reach the main actions", async ({ page }) => {
  await loginAs(page, USERS.farmer3);
  await page.goto("/farmer");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: /skip to/i });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("mobile menu opens and lists navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAs(page, USERS.farmer3);
  await page.goto("/farmer");
  const menu = page.getByRole("button", { name: "Menu" });
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#mobile-nav").getByRole("link").first()).toBeVisible();
});
