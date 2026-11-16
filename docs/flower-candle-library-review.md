# Flower & Candle — local Stages A and B review

No commit, push, or deployment has been performed. Recorded narration (Stage C), Balloon, and Bee are not implemented.

## Implemented

- Library: All / Calm / Focus & Balance / Kids. Kids is an audience classification. All retains the five adults followed by a Kids group; Energy remains hidden.
- Stable flower-candle identity, illustrated introduction, nose inhale and mouth exhale.
- Separate saved Kids profile: default 2/4 seconds, no holds, one minute. Inhale is an integer from 1–6; exhale is always twice inhale. Stored and history-restored values are normalized. Adult and Custom memory remain independent.
- Introduction uses the approved watercolor artwork and exact approved two-step instructions. Collapsible settings expose one inhale slider, derived exhale, and session length. No narration player, placeholder recording, or new guidance preference.
- Existing session engine, three-second silent preparation, controls, protected Back and stale-Forward protection are reused. Completion and explicit End return to the introduction. Natural completion preserves already-triggered audio tails; explicit Stop/Restart cleanup is retained.
- Existing candle geometry, progress-driven flame stages, extinguishing window, smoke, water and reduced-motion behavior are reused. Approved artwork bytes and engine.ts are unchanged.
- Existing consent-based analytics identify Flower & Candle correctly. No new event types or personal data.
- Required illustrations are included in the production precache. Safe-update restoration keeps Kids and adult settings separate.

## Verification

- Unit tests: 131 passed, zero failed.
- TypeScript and production build: passed; 44 precached assets verified.
- Production browser regression run: 97 passed (Home, library, startup, navigation and Kids).
- Prototype/artwork checks: 52 unique checks passed. Six initially stale focus assertions were corrected to the shared introduction main element and rerun successfully.
- Real-service-worker checks: 15 unique cases passed. One older test expected five cards; the approved addition makes six. The corrected offline case passed on rerun.
- Final production smoke run: 14 passed, including all language/mobile combinations and two Kids safe-update/offline cases.
- Filter focus checks: 12 passed across Hebrew, English, Japanese and widths 320, 360, 375 and 390.
- git diff --check: passed.

These are overlapping targeted suites, not counts to add together. The entire unrelated browser suite was not rerun. Previously documented unrelated Japanese-footer failures were not changed.

## Local review

Run npm run dev -- --port 5175 --strictPort and open http://localhost:5175/breathwork-app/ on the machine hosting the server.

Home → Explore More Breathing Exercises → Kids → Flower & Candle. Expand Practice Settings, try all six rhythms, then Start. Use Back during preparation or active practice to test Stay/End. Return to adult settings to verify their saved values remain independent.

The existing development entry remains http://localhost:5175/breathwork-app/?prototype=flower-candle . This is a local URL, not a public remote preview.

For production/offline review, build and run npm run preview -- --port 5174, then open http://localhost:5174/breathwork-app/ . Load once online before testing offline.

## Review media and limitations

The accompanying MP4 is a normal-speed Hebrew 375×667 CSS viewport recording, encoded at 750×1334, with two complete default 2/4-second cycles. It is a muted visual preview. JPEGs show all three languages at 375px plus Hebrew at 320px, including library, introduction, expanded settings, and four animation stages. Expanded introduction settings scroll internally; active screens retain the compact normal-size layout.

Physical Android/iOS Back, Safari, device keyboards and screen-reader verification remain manual. Stage C requires the actual recording and separate approval. No public preview deployment has been created.

## Files changed in this integration

This list is relative to the pre-task local snapshot, not HEAD: the approved prototype already had uncommitted files. Existing local work was preserved.

- `src/analytics.test.mjs`
- `src/analytics.ts`
- `src/components/FlowerCandleIntroduction.tsx`
- `src/components/FlowerCandleSession.tsx`
- `src/components/PracticeLibrary.tsx`
- `src/flower-candle.test.mjs`
- `src/flower-candle.ts`
- `src/kids-settings.test.mjs`
- `src/kids-settings.ts`
- `src/launch-configuration.ts`
- `src/locales/en.json`
- `src/locales/he.json`
- `src/locales/ja.json`
- `src/main.tsx`
- `src/navigation-controller.test.mjs`
- `src/navigation-controller.ts`
- `src/navigation.ts`
- `src/practices.ts`
- `src/prototypes/FlowerCandleCircle.tsx`
- `src/prototypes/FlowerCandlePrototype.tsx`
- `src/prototypes/flower-candle.css`
- `src/useAppNavigation.ts`
- `src/useBreathingSession.ts`
- `tests/flower-candle-art.spec.ts`
- `tests/flower-candle.spec.ts`
- `tests/kids-library.spec.ts`
- `tests/practice-library.spec.ts`
- `tests/pwa.spec.ts`
- `docs/flower-candle-library-review.md` (this report)
