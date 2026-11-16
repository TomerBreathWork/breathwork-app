# Flower & Candle — local review prototype

Run `npm run dev -- --port 5175 --strictPort`, then open:

http://localhost:5175/breathwork-app/?prototype=flower-candle

Use Codex's forwarded port 5175 if reviewing from a different device. Localhost
on a phone refers to the phone; this is not a public preview deployment.

The entry is gated by `import.meta.env.DEV`. A production build opens the normal
adult app even with this query parameter. No library or Home entry is added.

## Review

- Default: 2 seconds in / 4 seconds out, no holds, one requested minute.
- Inhale range: 1–4 seconds in half-second steps; exhale is always twice inhale.
- Session choices: 1, 2, 3, or 5 minutes. The existing full-cycle rule applies.
- Optional introduction is under “Before you begin.” No voice recording exists;
  spoken guidance is disabled until `introductionRecording` has a real source.
  The component accepts future introduction playback without a TTS service.
- Start includes the incumbent three-second silent preparation. Mute, Pause,
  Resume, Restart, Stop and the protected Back dialog use the adult lifecycle.
- Prototype breathing settings live only in React state. Adult saved rhythms,
  duration, volume, background and sound preferences are not overwritten.
  The existing language preference continues to be shared.
- No new analytics events, PWA routes, service-worker rules or media manifests.
  This development-only exercise is not offered as an installed/offline feature.

## Animation

The existing `BreathingCircle` renders the synchronized water and phase count.
`SessionPanel` accepts an optional circle slot, retaining its existing default.
An isolated watercolor layer sits over subdued water. Flower expansion and flame
poses use the existing engine's normalized phase progress. Five supplied flame
stages are registered to a shared continuous pose before their pigment blends;
complementary weights and isolated `plus-lighter` compositing avoid double
silhouettes and brightness dips. Measured source rotations/scales compensate for
the baked transformations; the shared virtual anchor is (130,330) on 420×420 PNGs.
The candle placement maps that anchor to source coordinate (180,24) in its wick.

The flame is upright initially, then bends progressively. It stays lit through
84% of exhale, fades smoothly to zero at 95%, then shows a small supplied smoke
curl. No animation clock or second breathing engine is introduced. Artwork
appearance fades also use phase progress, so Pause freezes every layer. Restart
resets visuals through the existing preparation lifecycle. Reduced motion uses
one upright painting without expansion or bending, retaining extinguishing and
smoke. Browser image decode begins on entering the local prototype, without
delaying Start or extending preparation.

## Asset provenance

Eight unchanged PNGs from the supplied `flower_candle_assets_clean.zip` are in
`src/prototypes/assets/`: flower, candle body, smoke, and five `_aligned` flames.
The aligned and non-aligned flame files are byte-identical; only one set is used.
The temporary generated watercolor sprite and SVG flame/smoke have been removed.
No replacement artwork, stock photography or audio was generated.

The supplied paintings retain some pale paper-colored edges and tightly cropped
contours. They were not retouched. Further alpha-edge polishing would require
an approved revised export; current warm-ivory presentation softens those edges.

## Reuse

Balloon and Bee can reuse the circle slot, shared session controls, timing,
normalized progress, ratio helper, localization and optional introduction shell.
Their illustrations and phase-specific visual responses would be separate.
No children's library or generalized plugin framework is added here.

## Limitations

Physical Android/iOS and screen-reader testing require real devices. Desktop
Chromium mobile viewports exercise browser Back, not an Android OS gesture.
There is no voice guidance recording. The prototype is intentionally absent
from the public production bundle and offline library.

## Initial prototype verification (before approved-asset replacement)

- 118 unit tests passed (`npm test`).
- 18 prototype browser tests passed in development mode.
- 81 current adult Home, navigation, library, startup, preparation and countdown
  browser tests passed against the production build.
- 13 real-service-worker production PWA tests passed.
- TypeScript, production build and offline precache validation passed (36 assets).
- Three older tests that try to start immediately from the Home chooser fail on
  both this version and an isolated build of the unchanged committed baseline:
  `countdown.spec.ts`'s pause test and `preparation.spec.ts`'s pause and opacity
  tests. They were not changed or counted as passing.
- Active layouts were checked at 320×568, 360×640, 375×667 and 390×844 in English,
  Hebrew and Japanese. At 200% text size, vertical scrolling remains available;
  a Japanese 320px check measured 320px document width with no horizontal overflow.
- JPEG review captures cover setup, inhale, exhale and extinguished flame in all
  three languages. A silent 18.6-second MP4 records the real browser animation.

To run prototype browser checks locally, use the existing development Playwright
configuration: `npm run test:e2e -- tests/flower-candle.spec.ts` (port 5174 must be
free). Production verification intentionally excludes this DEV-only test file.

## Approved artwork integration verification

- All eight used PNGs are byte-identical to `flower_candle_assets_clean.zip`.
- 122 unit tests passed, including source-pose registration, continuous blend
  weights, fixed wick anchors and unchanged 1:2/full-cycle timing.
- 18 existing prototype browser tests passed in all three languages.
- 21 additional artwork browser tests passed: all four requested mobile widths,
  the four whole-second rhythms, three half-second rhythms at 320px, wick
  alignment (<0.3 CSS px), decoded image layers, late extinguishing/smoke,
  paused layer/water stability, resumed progress, Restart and reduced motion.
- 29 adult navigation/library browser tests and 13 production PWA tests passed.
- TypeScript and production build passed; the existing 36-asset production
  precache is unchanged in scope. The prototype remains development-only.
- Updated JPEGs show flower, upright, bent and extinguished stages at 320px in
  English/Hebrew/Japanese, plus English 375px. An 18.2-second silent MP4 records
  the real animation through complete inhale/exhale cycles.
- No commits, pushes or deployments were performed.

Artwork tests: `npm run test:e2e -- tests/flower-candle.spec.ts tests/flower-candle-art.spec.ts`
(using the development server, not the production preview).


## Focused visual refinement

- Candle body enlarged by 10%, retaining its intrinsic aspect ratio. Flame scale
  and wick placement were rebalanced within the original vertical clearance;
  phase labels, countdowns, outer circle and page layout were not moved.
- Water-layer opacity increased from .24 to .34, and the subtle wave from .45
  to .55. The existing aqua palette and water timing are unchanged.
- Continuous monotone Hermite interpolation now carries the pose through the
  interior source-stage boundaries, instead of easing to a stop at each one.
  Registered pigment blending, normalized progress, the 84–95% extinguishing
  window and brief smoke remain intact. No image assets were altered.
- 124 unit tests, 45 prototype/artwork browser tests, TypeScript, production
  build and the 36-asset production precache validation passed. Six updated
  mobile-clearance tests were also rerun after simplifying their setup.
- All existing supported rhythms were checked, plus Hebrew/English/Japanese at
  the four mobile viewport sizes. Dedicated title/countdown clearance and
  RTL/LTR checks cover 320px and 375px. Physical device review remains manual.
- The new Hebrew MP4 records two complete 2/4 cycles at normal speed in a
  375×667 viewport (encoded at 2× resolution), with four Hebrew review stills
  and supplementary English/Japanese captures. No commit, push or deployment.
