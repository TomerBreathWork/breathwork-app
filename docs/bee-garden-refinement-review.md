# Bee Breathing — local refinement review

No commit, push or deployment was performed. The pre-existing local Bee implementation was preserved.

## Changes in this refinement

- Hebrew narration uses a single large illustration and its matching instruction at a time. The overview still shows the three steps when narration is inactive, including in English and Japanese.
- The existing recording controller supplies cues at the owner-confirmed 3 / 7 / 13 / 29 seconds. The opening shows inhalation; the final invitation retains the humming image. Replay resets the sequence. Pause retains the current illustration; existing Skip, cancellation and preparation behavior are reused.
- Added localized humming letters and a delicate yellow wave as SVG elements alongside the existing closed-mouth portrait. Existing nose arrows, ear gestures and vibration marks are retained. Explicit SVG crop boundaries prevent neighboring atlas images from leaking into the larger frame.
- Integrated the already-prepared watercolor garden as the breathing-circle background, beneath the water, bee, phase label and countdown. Reduced the bee's displayed dimensions slightly (32%/62% to 30%/58% of its flight area), without changing the path or phase progress.
- No changes to the breathing engine, figure-eight calculations, audio files, narration cue times, saved settings, navigation, analytics, adult exercises or Flower & Candle were made in this refinement.

## Files changed relative to the resumed local implementation

- `src/bee-introduction.ts` — single-image selection helper.
- `src/bee-introduction.test.mjs` — cue sequence/reset tests.
- `src/components/BeeIntroduction.tsx` — narration-only illustration stage, matching copy, retained overview/settings.
- `src/components/BeeArtwork.tsx` — bounded atlas crops and localized humming cue.
- `src/components/BeeCircle.tsx` — prepared garden URL.
- `src/bee.css` — scoped stage, garden and slightly smaller bee styling.
- `src/locales/en.json`, `he.json`, `ja.json` — one humming cue key per language.
- `tests/bee-refinements.spec.ts` — four mobile widths, single-image exposure, stable stage, crop protection, pause, preparation and garden loading.
- This review document.

The garden image and the other uncommitted Bee integration files already existed before this resumed refinement. A SHA-256 snapshot of the resumed source was used to distinguish those earlier changes. No files were deleted.

## Verification

- Unit tests: 155 passed.
- Bee browser suite plus initial refinement tests: 32 passed.
- Final refinement tests after explicit SVG cropping: 4 passed (320, 360, 375 and 390px).
- Broader production-preview regressions: 108 initially passed; two page navigations encountered HTTP load failures while the preview directory was being rebuilt. Both passed when rerun against the stable build. 20 conditional tests were skipped in that invocation; production PWA tests were run separately with their required production flag.
- Production TypeScript check, media validation, Vite build and offline validation passed; 48 application/media assets precached.
- Production PWA browser suite: 19 passed, including full offline Bee narration and safe updates.
- Dedicated real service-worker offline check: the new garden decoded at 1254 × 1254 after a fully offline reload, while Bee practice ran.
- `git diff --check` passed.

The Bee suite covers all supported exhale durations (4–12 seconds), the unchanged figure-eight geometry, pause/resume/restart, protected Back, stale Forward, independent saved profiles, three languages at four mobile widths, enlarged text, reduced motion and narration cancellation. The broader suites cover Home, navigation, practice library, Kids, startup and Flower & Candle narration.

## Review media

All files are in the accompanying `bee-garden-refinement` download bundle:

- `he-narration-and-two-cycles.mp4`: approximately 52.56 seconds, full 375 × 667 mobile composition, Hebrew recording, silent preparation and over two default 3s/5s breathing cycles, normal playback speed. Encoded at 750 × 1334 for viewing.
- `he-two-breathing-cycles.mp4`: approximately 19.56 seconds, preparation tail plus over two complete default cycles; silent because bowl guidance was muted for visual review.
- Hebrew overview, each narration stage at 320/375px, humming close-up, garden screenshots, English and Japanese overview screenshots.
- `recording-evidence.json`: native audio playing/ended timestamps and screencast duration. The supplied recording is muxed into the full preview at the measured playback offset; application source audio is unchanged.

## Artwork and verification limitations

The original three-panel poster is visible in the conversation but is still unavailable as a local source binary. Miya's existing prepared portrait atlas was kept byte-for-byte unchanged. No face, eye, mouth, hand or character was regenerated. Humming letters and a wave were added as separate vector cues; this is not a claim of pixel-exact extraction of the original poster. The original file is needed for any exact restoration of facial details or original lettering.

Cue behavior was verified against native playback time using the owner's confirmed timestamps. Independent transcription of the spoken recording was unavailable; the full narrated preview is provided for the owner's content/synchronization review.

Browser checks use desktop Chromium mobile viewports. Physical Android and iOS/Safari behavior should still receive device review. At short screens/enlarged text, introduction content remains scrollable rather than being clipped.

## Repository safety

HEAD remains `5242230d15063017b75b3f33d209f3c730713468` on `main`. Rollback tag `rollback-pre-design-2026-11-11` remains at `253ce240fae1f1d28c759848f569ec6e0ce16fe6`. All changes remain local and uncommitted, including the earlier Bee integration work.
