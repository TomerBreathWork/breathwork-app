# Bee Breathing — bowl cues and water visibility (local review)

## Diagnosis and implementation

The previously delivered garden-refinement previews explicitly seeded `still-settings` with `sound: "silent"`. This is why those previews lacked the familiar bowl cues. The actual Bee implementation already inherits the adult sound/volume preference through `beeSessionSettings`, calls the shared `useBreathingSession`, and plays the existing `SampleAudio` recordings. No missing audio wiring, Bee-specific silence override, or continuous humming loop was found.

No production audio change was needed. Overriding a saved silent preference would break the requested shared mute behavior. For a saved silent preference, the existing speaker button enables the normal sound setting and future phase cues, without replaying the current phase's missed strike.

Verified runtime mapping (the same as adult practices):

- Inhale: `high_F4_349Hz.mp3`.
- Exhale: `low_F3_174Hz.mp3`.
- No holds occur in Bee, so no hold sources play.

The shared engine, gain calibration, volume, eight-second sample decays, natural tail overlap, phase-event ledger, paused-tail offsets and completion cleanup are unchanged. Each phase has one fresh strike; natural decaying tails can overlap exactly as they do in adult practice. No prerecorded humming was added.

The only application edit is in `src/bee.css`:

- Bee water-layer opacity: `.34` inherited from the shared Kids presentation → `.65` for Bee only.
- Bee water gradient: slightly stronger translucent aqua/teal (`#79c8c2a6` → `#4d9d9ba6`).
- Bee wave: `.8` opacity and translucent `#88d2cbb3`.

The water height still comes directly from the shared breathing phase progress. No animation timer or breathing calculation was added. Existing pause and reduced-motion behavior is retained. Garden, bee, figure-eight geometry, narration illustrations and timings remain unchanged.

## Actual audio evidence and preview

`bee-two-cycles-live-bowl-audio.mp4` shows the complete 375 × 667 mobile composition at normal speed: three-second silent preparation followed by more than two default 3-second inhale / 5-second exhale cycles. The video is approximately 19.97 seconds and encoded at 750 × 1334 for viewing.

Audio is captured from a parallel, test-only tap of the browser's actual final Web Audio output using `MediaStreamDestination`/`MediaRecorder`. It is not a manually reconstructed sequence or an overlay made from separate samples. No production instrumentation was added. The captured audio was aligned to the screencast's measured start timestamp, without gain adjustment. The MP4's first audible output occurs around 3.02 seconds, matching the end of preparation.

The recording contains five fresh starts: high → low → high → low → high. After the initial start, scheduled intervals are 3 / 5 / 3 / 5 seconds. Source offsets are zero and no phase-transition stops occur. The fifth start is the first inhale after the two completed cycles. All three existing bowl samples decode, but only inhale/exhale samples play.

Measured live captured mix: peak approximately **−2.18 dBFS**, RMS approximately **−15.27 dBFS**, no clipped samples detected. Automated analyser checks separately confirm non-zero rendered output for inhale and exhale and near-zero output after mute. These establish real browser output, not a claim about loudness on a particular physical phone speaker. Physical phone listening remains appropriate for final owner review.

Screenshots show near-beginning and near-end water levels for inhale and exhale at both 320 × 568 and 375 × 667. The low/high screenshots intentionally sit just inside phase boundaries rather than at the exact boundary frame, where the phase changes immediately.

## Tests

- Unit tests: 155 passed.
- New browser checks: 11 passed (9 audio/mobile/reduced-motion cases plus 2 normal-motion rhythm cases).
- Existing regression suites: **68 passed, 4 failed**. All four failures are in the older `tests/sample-audio.spec.ts`: they expect `.start-button` before making a selection on the approved initial Home chooser. They fail before audio assertions. This is an outdated navigation expectation in unchanged tests, not a water/audio regression; those tests were not edited. Bee, prior garden refinements, navigation and Flower & Candle narration passed.
- Production PWA regression: **3 passed**, covering Bee offline flight/settings/update continuity and full offline Hebrew narration.
- Production build passed, including TypeScript, media validation and validation of all 48 precached assets.
- `git diff --check` passed.

The new checks cover real decoded sample playback/output, no sources during narration/preparation, mute/unmute without missed strikes, pause/resume offsets, restart/stop, three languages at 320/375px, reduced motion and water freeze. The normal-motion cases verify half-inhale and half-exhale levels and pause/resume at both 2/4 and 6/12 rhythms. Existing Bee tests exercise all exhale durations 4–12 seconds and independent settings, navigation and completion.

During test development, the water-freeze assertion was corrected to snapshot the level **after** pressing Pause. The engine correctly settles to the precise pause timestamp, which may differ slightly from the previous animation frame. No application change was made for that test-harness issue.

## Changed files in this task

- `src/bee.css` — Bee-only water styling.
- `tests/bee-audio-water.spec.ts` — focused regression coverage.
- `docs/bee-audio-water-review.md` — diagnosis, verification and review media notes.

A SHA-256 snapshot taken before this task distinguishes these changes from the previously approved, still-uncommitted Bee implementation. No prior work was discarded. No translations, artwork, audio files, engine, settings, navigation, Flower & Candle or adult practice files changed in this task.

No commit, push or deployment performed. HEAD and the existing rollback tag are unchanged.
