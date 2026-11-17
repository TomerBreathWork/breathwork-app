# Breath Flow — desktop layout review

This report records the local review before publication. The review baseline was `a78422197acc6d80a3f31431ff947d69b06ae2d9`; the rollback tag is unchanged.

## What changed

A desktop-only `@media (min-width: 768px)` section in `src/style.css` creates a centered 430px column. Its available height follows the viewport (`100dvh` minus margins), capped at 58rem for phone-like proportions on tall monitors. The existing photograph/overlay still cover the full viewport. There is no artificial device frame and no transform scaling.

The column becomes the existing `app-viewport` size container. This lets compact, height-aware rules work within the desktop column rather than measuring the full monitor width. Scoped spacing and branding adjustments replace the old oversized desktop padding/header. Controls, descriptions, session settings, safety information and artwork remain present. The language picker and privacy shield align with the column, using logical properties for RTL. Help dialogs have the same column width; native session-exit dialogs retain their established centered presentation.

Long discovery content retains its own scroll region and fixed accessible Start action. Very short windows and enlarged text can scroll the page as necessary. The existing nonmodal analytics notice keeps its full focus-clearance spacer (`flex: none`); no consent logic, copy or persistence changed.

### Approved background refinement

Desktop Home's ivory veil is reduced from 65% to 52%, and adult sessions' ivory veil from 20% to 16% — a 20% relative reduction. This uses the existing photo-opacity variables (`.35 → .48` and `.80 → .84`) within the desktop media query. The background image, scene gradient, header glow, layout geometry and mobile styling are unchanged.

## Normal desktop fit

Measured in English, Hebrew and Japanese at 1366×768, 1440×900 and 1920×1080, at 100% equivalent CSS viewport size. These results assume the analytics notice is resolved/closed; its open state intentionally reserves scroll clearance for accessible keyboard use.

| Screen | 1366×768 | 1440×900 | 1920×1080 |
| --- | --- | --- | --- |
| Initial Home chooser | Fits, no page scroll | Fits | Fits |
| Selected Home, all four practices | Fits; Start visible | Fits | Fits |
| Active adult session | Fits, all controls visible | Fits | Fits |
| Calm library (3 cards) | Fits without internal scroll | Fits | Fits |
| Kids library (2 cards) | Fits without internal scroll | Fits | Fits |
| Flower & Candle active | Fits, all controls visible | Fits | Fits |
| Bee active | Fits, all controls visible | Fits | Fits |
| Flower introduction, settings collapsed | Small internal scroll (28–64px) | Fits | Fits |
| Bee introduction, settings collapsed | Internal scroll (150–186px) | Small internal scroll (18–54px) | Fits |
| Expanded children's settings | Internal scroll | Internal scroll | Internal scroll |

All measured normal desktop screens have zero page overflow. The introduction exceptions above scroll inside the panel and keep Start visible. Hebrew's longer paragraphs account for the larger end of each range. Instructions and comfort guidance were retained rather than hidden or made smaller. All-library content, long details/help, open consent clearance, larger text and short windows can scroll when needed.

Existing fresh-launch behavior is unchanged: fresh launches show the chooser, while selected Home is reached by selecting a practice and retains its saved settings. The desktop screenshots labeled `selected` show that existing state, not a new automatic launch behavior.

## Mobile preservation

All new application CSS is guarded by the 768px minimum-width query. Mobile HTML, typography, cards, controls, timing and animation code are unchanged.

Before/after Home and selected-Home captures were compared at 320×568, 360×640, 375×667 and 390×844 in all three languages: **24 of 24 comparisons are pixel-identical** after waiting for the existing background image to decode. Geometry measurements are also unchanged. Current mobile library, introduction and active-session screenshots are included, and the existing mobile behavior suites were run.

## Verification

Final publication checks after the approved background refinement: **155 unit tests, 69 browser tests and 6 offline/PWA tests passed**, as did TypeScript and the production build. Fresh mobile Home-state comparisons remained pixel-identical in all 24 cases.

- **155 unit tests passed.**
- **28 new layout cases passed:** all three languages at the three desktop sizes; each Home preset; adult/Kids sessions; short library categories; protected Back dialog; expanded settings access; mobile media-query isolation; keyboard focus; desktop pointer slider dragging; 768×1024 and 1024×768 tablets; 125%/150% zoom-equivalent reflow and 200% root text; desktop consent clearance.
- **Existing regression run:** 156 passed, 3 failed, 1 skipped initially. One failure exposed the desktop flex spacer shrinking under the consent notice; the CSS correction fixed it. The complete Home suite then passed **39/39**, including storage-disabled navigation. The remaining two Japanese 320px accessibility failures reproduce against the untouched published build and were not changed: numeric-row overlap at 200% text, and consent focus clearance at 200% text.
- **6 production PWA cases passed:** Kids/Bee settings and navigation survive safe updates, offline artwork/flight, and full offline Flower/Bee Hebrew narration.
- **TypeScript, media validation, production build and validation of all 48 precached assets passed.**
- `git diff --check` passed.

A test setup was corrected to center controls before asserting 100% viewport visibility: minimal browser autoscrolling could leave less than one fractional pixel outside a scrollport. No application content was hidden or tests skipped to achieve the final results.

## Visual evidence

JPEG screenshots cover all three desktop sizes and four mobile sizes in Hebrew, English and Japanese. Desktop views include chooser, selected Home, active adult session, Calm/Kids library, both children's introductions and exercises, expanded settings, All-library scrolling, pause/exit confirmation, adult completion, help, and fresh/focused consent states. Additional shots show a tablet, enlarged text and zoom-equivalent reflow.

- **Desktop ZIP:** final desktop screenshots, selected before views, gallery HTML, fit report and logs.
- **Mobile ZIP:** current mobile screenshots plus the 24 matching published Home-state captures and pixel-comparison results.

Extract a ZIP and open `index.html` for a browsable local gallery; each thumbnail opens the original full-resolution JPEG. The screenshots themselves remain directly downloadable.

## Limits

These are Chromium browser tests and rendered captures, not physical-device testing or an accessibility certification. 125%/150% coverage uses equivalent reduced CSS viewports; it does not claim that native browser zoom controls were exercised. Actual Chrome/Safari/Firefox zoom, physical tablets, and NVDA/VoiceOver remain manual checks. Semantic markup/localization logic were not modified. Reduced-motion preferences were exercised and existing motion rules preserved.

Impeccable's optional context engine was unavailable because it was not installed at its configured cache path. No engine, hooks or dependencies were installed. The installed adaptation/craft references, PRODUCT.md and current Vercel Web Interface Guidelines informed the review; the approved Breath Flow identity and user scope took precedence over generic redesign advice.

## Files changed

- `src/style.css` — desktop-only layout rules.
- `tests/desktop-layout.spec.ts` — focused browser coverage.
- `docs/desktop-layout-review.md` — this review report.

No application TypeScript/TSX, translations, artwork, media, breathing engine, audio, navigation, saved preferences, service worker or workflow files changed.
