import type { Page } from "@playwright/test";
/** Legacy component checks still verify the retained options in isolation.
 * Only tests reveal this subtree; no app flag or user-facing route exposes it.
 * Normal mobile/visibility checks must not call this helper. */
export async function showRetainedAdvanced(page: Page) {
  await page.locator("[data-retained-advanced]").evaluate((node: HTMLElement) => { node.hidden = false; });
}
