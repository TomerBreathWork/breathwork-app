# Targeted test-branch corrections

All source work stays on the existing `feature/practice-library` branch. The actual starting commit was `a0541ce`; no rollback, reset, new branch, merge or production deployment was performed. `main` remains at `1fe84e6dabe810d60b58f1798530a1c171f2d608`.

## Separate groups

1. `5b84efb`: first-visit How to Use glow, stopped and saved when help opens. Reduced motion disables animation. Existing English/Hebrew/Japanese instructions and integrated safety section are preserved. Files: `SettingsFooter.tsx`, `style.css`, `tests/test-corrections.spec.ts`.
2. `931fb9a`: Energy filter hidden without deleting the category or practice data; Box belongs only to Focus and retains 4/4/4/4. Files: `practices.ts`, `PracticeLibrary.tsx`, practice data/browser tests.
3. `6ab0100`: Advanced Options are hidden on Home and Practice without deleting code or preferences. A short localized selected-pattern explanation, phase timings and a silent CSS preview appear above Start. Preview keyframes use the engine's integer-millisecond boundaries, skip zero phases and stay stationary during holds. Reduced motion uses a static track. Files: `PatternPreview.tsx`, `pattern-preview.ts`, `SettingsPanel.tsx`, `SessionPanel.tsx`, `main.tsx`, `style.css`, corresponding tests.
4. `7c4480b`: shared preparation constant is 3000 ms; all translated instructions/tests/docs agree. Preparation remains silent, separate from the whole-cycle session duration, and supports Pause/Resume/Restart/Stop. The 44px speaker button uses existing mute state/audio cancellation and continuation behavior. It does not pause the clock or replay the strike on unmute. Saved silence is shown as muted; explicitly unmuting it enables the existing default bowls. Files: `preparation.ts`, `SessionPanel.tsx`, `main.tsx`, `style.css`, help translation resources, preparation/browser tests and documentation.
5. This commit: Japanese compact labels use native word segmentation, with honorific prefixes kept with their words, and particles and closing punctuation attached to preceding words. Atomic words wrap as units; a word too wide for its control gets a local font adjustment. Full accessible names remain intact. English/Hebrew text retains its original markup. Files: `CompactLabel.tsx`, `japanese-label.ts`, compact-label consumers, `style.css` and focused tests.

## Nose reference blocked

No supplied nose reference was found among the available attachments. `BreathRouteIcon.tsx` is deliberately unchanged. A reference image is required before refining that illustration; no substitute artwork was invented.

## Verification and retained controls

Every group is built and checked before committing or beginning the next. The test-only `tests/retained-advanced.ts` helper exposes the retained subtree for legacy component regression checks; it adds no application setting, query parameter or UI entry point. Normal-flow tests never use it and assert that Advanced Options and their controls are absent from the visible/accessibility UI. Offline status remains available to screen readers without exposing settings.

Relevant browser coverage includes all three languages; Help persistence, Escape/focus/RTL and safety; filters and preset timings; exact fractional preview keyframes; three-second silence and full-cycle completion; Mute/Unmute without timing changes; Japanese word layout; mobile sizes 320×568, 360×592, 360×640, 375×667, 375×812, 390×664, 390×844, 393×660, 412×731; desktop and enlarged-text layouts; cached media and safe offline updates.

The existing realtime C4 scheduling check had one parallel-load failure and then passed three consecutive isolated reruns. Its engine is unchanged. Native Android/iOS browser behavior still merits device checks. The supplied logo, photos, MP3s, sound mapping/synthesis, precise phase engine, PWA assets/cache policy, dependencies and production workflow remain unchanged.

## Final results

- 53 unit tests passed.
- Full production browser regression completed with exit code 0: 121 passed, plus one timing-sensitive realtime C4 check that passed on retry (122 checks total). The unchanged C4 check also passed three consecutive isolated runs.
- After the final Japanese honorific-prefix adjustment, all 17 relevant Japanese browser checks passed.
- Production TypeScript/Vite build passed with exit code 0; all 32 required static resources were verified in the offline precache.
- Settings, preparation and active-practice screenshots were captured in English, Hebrew and Japanese. Japanese phase labels and footer text were inspected for visibility.
- Nose artwork remains blocked pending the reference image. Physical Android/iOS behavior still requires device verification.
