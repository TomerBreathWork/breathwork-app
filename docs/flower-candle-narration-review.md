# Flower & Candle — Hebrew recorded introduction review

Local release candidate only. No commit, push, or deployment. This note supersedes earlier statements that narration is deferred; the approved illustrations, written steps, animation and Japanese typography remain in place.

## Supplied file and measurements

Source: `src/assets/narration/miya flower mastered.mp3`.

- Browser playback duration: **25.6041 seconds**, measured from the actual HTML audio element, including its natural ended event.
- MP3, stereo, 44,100 Hz, 320 kb/s; 1,024,164 bytes.
- Decoded sample stream duration: approximately 25.626 seconds including MP3 frame padding.
- Integrated loudness: **−22.4 LUFS**; mean level −25.7 dBFS; true/sample peak approximately **−3.0 dBFS**. No digital clipping detected. No normalization, gain boost, voice processing, replacement or synthesis applied.
- SHA-256 (upload, repository asset and production asset all match): `52e87ee78e2aae6cf14cbf4c621df0fc3e578f0b70c44b8c0d18160465e01e14`.
- Some streaming/cached MP3 responses report an initially unknown/infinite duration. The application deliberately uses the real ended event, never a guessed-duration timer; full offline playback was verified.

## Illustration cues

These are the approximate cue times **confirmed by the product owner in this conversation**, not an invented transcript or independently transcribed word boundaries:

| Audio playback position | Presentation |
| --- | --- |
| 0–8 seconds | Both steps balanced |
| 8–14 seconds | Flower gently emphasized |
| 14–23 seconds | Candle gently emphasized |
| 23 seconds–audio end | Both balanced |

Cue selection reads the audio element's currentTime on timeupdate. Pausing freezes playback and cues. Reduced motion suppresses the scale/transition. Both written instructions remain readable; only the artwork receives subtle emphasis.

## Behavior and architecture

- Hebrew first-use Start, when guidance is enabled: real recording → three silent preparation seconds → existing breathing engine.
- Heard or skipped introductions persist an acknowledgment. Later Start goes directly to preparation. Replay plays the introduction alone and never launches a practice.
- Hebrew-only guidance checkbox is enabled by default and independent of bowls/mute. English and Japanese expose no unavailable voice controls and start directly.
- Preference storage: `breath-flow-flower-candle-introduction`, version 1, Hebrew enabled/acknowledged flags. Adult and Kids timing storage remain separate and unchanged.
- RecordedIntroduction owns the audio element, cancellation generation, preference and state. useRecordedIntroduction connects it to the illustrated screen. Future language recordings can be registered at this boundary without replacing the breathing engine or bowl scheduler.
- Initial Start/Replay unlocks the existing bowl AudioContext on the user gesture without starting its scheduler. Narration stops and handlers detach before preparation starts. Skip/ended/stale promises cannot launch duplicate sessions.
- Pause/backgrounding leaves narration paused. Foregrounding never resumes or starts a practice automatically. Navigation, language changes, pagehide, preference changes and unmount cancel pending audio callbacks. An already-ended background recording advances only after explicit Resume, without replaying the recording.
- Audio failures leave the written steps available with an explicit Start Without Introduction action. No forced or repeated narration.
- Narration stays on the existing details route. Existing protected Back applies once preparation/practice begins. Narration itself cancels on leaving the introduction.
- Pending PWA updates are blocked during loading, playing and paused narration, and through the preparation handoff. Safe updates then restore the introduction/profile. The MP3 is in the verified production precache; no service-worker protocol changes.
- No new analytics events, personal data, application dependencies or hooks.

## Verification

- 146 unit tests passed.
- 110 production regression cases passed: Home, startup/persistence, adult library, unified navigation, Kids and the initial 13 narration cases.
- Final narration suite: all 14 cases passed, including the additional missing-file test, real full recording completion, cue positions, replay, saved preference, backgrounding, stale callbacks, rapid Skip, language changes, mobile sizes and reduced motion. These overlap the preceding 110 cases.
- 35 prototype/layout cases passed in a clean rerun, including all six integer rhythms, 320/360/375/390 widths, all languages, enlarged text and the Japanese one-line headings.
- Three real-service-worker cases passed across targeted runs: two existing Kids safe-update/offline cases plus full real offline narration, pause, pending-update protection, natural completion and safe restoration. An initial test incorrectly assumed finite MP3 metadata before full streaming; it was corrected to verify actual playback/end instead. No asset or caching behavior was altered for that assertion.
- Timing-sensitive prototype tests now pause their simulated clock before starting, avoiding wall-time drift during browser assertions; engine timing was not changed.
- TypeScript and production build passed. All **45** precached assets verified. git diff --check passed.

## Review media

`Flower-and-Candle-Hebrew-introduction.mp4` is a normal-speed 375×667 mobile capture (encoded at 750×1334) showing the full recording, highlights, preparation and a full active breathing cycle. The preview contains the supplied narration, synchronized from its actual playback event. Bowls were intentionally muted for this recording; voice remains independent of bowl mute. The MP4's AAC preview track does not replace or modify the repository MP3.

JPEGs show the first-use checkbox, flower/candle/balanced narration states, preparation, active practice, returning Replay, paused narration and the unchanged English/Japanese text-only introductions.

## Remaining manual review

Physical Android Chrome and iOS Safari audio/autoplay/backgrounding should be checked on devices; automated mobile checks use Chromium emulation. No claim of physical-device or live-production verification is made. Cue boundaries are owner-confirmed approximate values and can be fine-tuned after listening to the preview. The local candidate is ready for publication approval; no publication has occurred.

## Files changed for this narration task

Relative to the approved local snapshot at the start of this task (earlier uncommitted library/prototype work is preserved):

- `src/assets/narration/miya flower mastered.mp3`
- `src/components/FlowerCandleIntroduction.tsx`
- `src/locales/en.json`
- `src/locales/he.json`
- `src/locales/ja.json`
- `src/main.tsx`
- `src/prototypes/FlowerCandlePrototype.tsx`
- `src/prototypes/flower-candle.css`
- `src/recorded-introduction.test.mjs`
- `src/recorded-introduction.ts`
- `src/useBreathingSession.ts`
- `src/useRecordedIntroduction.ts`
- `tests/flower-candle-art.spec.ts`
- `tests/flower-candle-narration.spec.ts`
- `tests/flower-candle.spec.ts`
- `tests/kids-library.spec.ts`
- `tests/pwa.spec.ts`
- `docs/flower-candle-narration-review.md` (this report)
