# Bee Breathing — local implementation review

**Local only. No commit, push or deployment.** The published Flower & Candle release remains at `5242230d15063017b75b3f33d209f3c730713468`. The existing rollback tag is untouched.

## Implemented

- Stable `bee-breathing` practice, second after Flower & Candle in Kids; one shared Kids group under All. Adult categories, hidden Energy, Home and adult defaults are preserved.
- Separate `breath-flow-bee-settings` profile. Defaults: 3/0/5/0 seconds, one requested minute. Inhale integers 2–6; exhale integers 4–12, independently adjustable. Holds are normalized to zero, including saved/history/update configurations. Duration remains independently adjustable. Flower and adult/Custom storage remain independent.
- Three localized illustrated steps, two sliders, session length, compact collapsible parent information, and shared pacing/safety guidance. The new note explicitly says not to reach the end of the countdown by effort, to shorten the exhale when needed, and to stop for dizziness/discomfort.
- Flower & Candle receives only the approved parent-information and comfort guidance additions, plus extraction of its identical existing voice-controls markup into a shared component. Its art, timings, settings, flame/smoke renderer and published narration cues remain intact.
- A single bee follows one figure eight during each normalized exhale. The two lobes complete over progress 0–1 for every 4–12-second exhale. No separate flight timer, looping CSS animation or duplicated breathing engine. Pause freezes coordinates; Resume continues; Restart resets. Reduced motion keeps the bee centered and removes the guide.
- Existing session panel, water, bowl scheduler, preparation, complete-cycle duration, protected Back, completion and stale-Forward handling reused. Default requested 60 seconds completes eight 8-second cycles: **64 breathing seconds**, plus separate three-second preparation.
- Existing consent-based practice events identify Bee correctly; no new event types, microphone capture, child identifiers, or tracking system.

## Artwork preparation and review

The owner approved the supplied composite as the visual reference/source and authorized clean animation assets while retaining Miya and the bee. The chat image was not exposed as a local original-image binary. Source-guided image editing prepared a transparent 1254×1254 RGBA atlas containing the three Miya steps and the bee; SVG viewport crops reuse the same prepared artwork for the introduction, card and active animation. No unrelated stock illustrations or replacement character design was introduced.

**Please review likeness, closed-mouth expressions and matte edges before publication. These are source-guided prepared assets, not a claim of pixel-identical crops from the original file.** If pixel-exact extraction is required, the original image file is needed. The source-derived prepared PNG is included in the review ZIP. All mouths are closed in the ear-covering and humming steps. No Hebrew lettering is baked into the assets, allowing the three localizations to use native text.

The active bee remains upright; no separate wing-flapping animation was added, keeping motion restrained. The optional dashed guide is thin and muted. The bee and guide remain clear of the countdown and inside the circle at the tested sizes.

## Hebrew narration

- Original `miya bee master.mp3` copied unchanged, 1,240,272 bytes, MP3 stereo 44.1 kHz, 320 kb/s.
- Browser duration measured approximately **31.007 seconds** (initial CBR metadata 31.0068; natural ended event 31.007347 in the recorded preview).
- Mean −27.4 dBFS, integrated −23.6 LUFS, true/sample peak approximately −4.2 dBFS; no digital clipping detected. No processing, gain alteration, stretching, synthetic speech or replacement recording.
- Upload/repository SHA-256: `61c199c16e3bf2607dc8770796fa88ba77c17b14c908c404d5cf618f88385e53`.
- Owner-confirmed approximate cue points: 3s inhale, 7s mouth/ears, 13s humming, 29s balanced invitation. These are confirmed annotations, not invented or independently transcribed word boundaries.
- Highlights follow the audio element's currentTime. First-use Hebrew Start → narration → three silent preparation seconds → practice. Skip, standalone Replay, background pause, navigation/language cleanup and error fallback use the same released RecordedIntroduction player.
- Independent `breath-flow-bee-introduction` acknowledgment/guidance preference; Flower's preference key and behavior preserved. English and Japanese remain text-only, with no unavailable voice controls. The voice is independent of bowl mute.

## PWA and preservation

Both new assets are imported through Vite with the existing GitHub Pages base path. The production precache contains **47 verified assets**. Real-service-worker tests cover offline illustration decoding, complete offline voice playback, separate profiles, and safe updates from Bee details and Kids library. No manifest, service-worker protocol or deployment workflow changes.

## Verification

- **153 unit tests passed**, including all 45 independent inhale/exhale combinations, normalization, settings separation, path endpoints/one-loop behavior and narration independence.
- **28 Bee browser cases passed** in a clean full run: all three languages, widths 320/360/375/390, independent controls, profiles, all nine exhale lengths, Pause/Resume/Restart, completion, Back/Stay/End/Forward, narration cues/replay/cancellation and reduced motion/enlarged text.
- **111 existing production browser checks passed** for Home, startup, adult library, navigation, Flower & Candle integration and its narration.
- **35 Flower prototype/layout cases passed**.
- **Six real-service-worker cases passed**: three new Bee cases and the three existing Flower/Kids offline/update cases, including both complete recordings played offline.
- **30 final text/layout checks passed** after the shared safety wording was completed. These overlap other suites and recheck active mobile fitting, expanded controls, enlarged text and Flower introduction layout.
- TypeScript and production build passed; all 47 precached assets verified. git diff --check passed. Existing one-Kids/six-card test expectations were updated to two Kids/seven total cards. Render-frame tests wait for asynchronous Resume and allow a frame's coordinate quantization; no engine durations were altered.

These are targeted suites, not a claim that every unrelated browser test was run. Physical Android/iOS/Safari audio, installed-PWA Back and screen-reader review remain manual recommendations.

## Review media

- `Bee-Breathing-two-cycles.mp4`: approximately 19.8 seconds, normal speed, preparation and at least two complete default 3/5 breathing cycles.
- `Bee-Breathing-Hebrew-narration-and-practice.mp4`: approximately 51.76 seconds, real Hebrew narration and highlights, preparation, and those two cycles. The supplied voice was synchronized to its actual playback event for the preview; MP4 audio encoding does not modify the repository MP3.
- Both recordings use a 375×667 CSS viewport, encoded at 750×1334. Bowls were intentionally muted; narration remained enabled independently in the full recording.
- Captured phase transitions measured the two breathing cycles at approximately 15,997.4ms (normal rendering/frame timing around the exact 16-second engine schedule). No accelerated clock was used for video.
- JPEGs cover Hebrew Kids library, introduction, parent information, expanded settings, inhale/exhale and narration stages; English/Japanese examples and Hebrew/Japanese 320px versions are also included. Educational content scrolls internally when needed. Normal-size active screens fit without page scrolling across all tested widths/languages.

## Local review

Use the workspace preview for Vite port 5175, or run `npm run dev -- --port 5175 --strictPort` after stopping an existing server on that port. On the hosting computer, open `http://localhost:5175/breathwork-app/`.

Home → Explore More Breathing Exercises → Kids → Bee Breathing. Expand parent information/settings; try 3/8, 4/10 and 6/12; switch to Flower and back to inspect independent persistence. Use a fresh browser profile to test first-use narration, or clear only `breath-flow-bee-introduction` rather than unrelated saved preferences. No public Bee preview or production deployment has been created.

## Files changed

Relative to the clean published baseline at the start of this task:

- `src/analytics.ts`
- `src/assets/bee/miya-bee-atlas.png`
- `src/assets/narration/miya bee master.mp3`
- `src/bee-breathing.test.mjs`
- `src/bee-breathing.ts`
- `src/bee-settings.ts`
- `src/bee.css`
- `src/components/BeeArtwork.tsx`
- `src/components/BeeCircle.tsx`
- `src/components/BeeIntroduction.tsx`
- `src/components/BeeSession.tsx`
- `src/components/FlowerCandleIntroduction.tsx`
- `src/components/KidsParentInformation.tsx`
- `src/components/PracticeLibrary.tsx`
- `src/components/RecordedIntroductionControls.tsx`
- `src/kids-settings.test.mjs`
- `src/kids-settings.ts`
- `src/locales/en.json`
- `src/locales/he.json`
- `src/locales/ja.json`
- `src/main.tsx`
- `src/navigation.ts`
- `src/practices.ts`
- `src/recorded-introduction.ts`
- `src/useRecordedIntroduction.ts`
- `tests/bee-breathing.spec.ts`
- `tests/kids-library.spec.ts`
- `tests/practice-library.spec.ts`
- `tests/pwa.spec.ts`
- `docs/bee-breathing-review.md` (this report)
