import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Accessibility is the product, so an automated WCAG audit is a CI gate.
// Every static route must have zero serious or critical violations.
const ROUTES = ["/", "/scan", "/capture", "/verify", "/talk", "/accessibility", "/privacy"];

for (const route of ROUTES) {
  test(`no serious a11y violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(
      blocking,
      blocking.map((v) => `${v.id}: ${v.help}`).join("\n"),
    ).toEqual([]);
  });
}
