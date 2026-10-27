# Breath Flow

**BY TOMER BREATHWORK** · Breathe. Be Present. Feel Better.

A free React + TypeScript + Vite breathing app. No registration, credentials, paid APIs, or runtime external requests. All preferences stay in this browser. Local photographs and native synthesized singing bowls are included; retired illustrations remain on disk only. Synthesis is the default sound mode; uploaded recordings remain selectable. Local photographs and recordings can be registered in the media manifest.

## Preview

Requires Node.js 22.12+ (Node 24 recommended) and npm.

```sh
cd /workspace/breathwork-app
npm ci
npm run dev
```

Open the address Vite prints in your browser (normally port 5173, under `/breathwork-app/`). In a cloud editor, use its port preview for port 5173 if available. To test the production version, run `npm run build` then `npm run preview` (port 4173). Production files are in `dist/`.

The app opens directly to Home. Choose Coherent Breathing, Custom Breathing, or Explore Breathing Practices, set seconds with the sliders or numeric fields, and press **Start Practice**. A hold set to 0 is skipped. Inhale/exhale use 0.5–40 seconds; holds use 0–120 seconds. Use **Restart**, **Pause / Resume**, or **Stop** during practice. **Advanced Options**, collapsed by default on both screens, contains background, sound, mute, preview, and volume. **Reset defaults** is available there on settings. It restores Coherent Breath (5.5–0–5.5–0), with a requested minimum of 3 minutes. Language selection appears only on settings.

The requested session length is a minimum. Sessions complete a whole breathing cycle: `ceil(requestedMilliseconds / cycleMilliseconds) * cycleMilliseconds`; the countdown includes this extension from the start. Hiding the browser tab pauses safely and silences cues; resume manually on return. New users start with Coherent Breathing for 3 requested minutes; returning users restore valid saved breathing choices, language, background, sound and volume. Stop and in-app navigation keep the current launch’s choices. Synthesized Tibetan Bowls is the default; it does not fetch audio files. You can select the existing recordings under Advanced Options. In recording mode, missing or undecodable files use per-role synthesis instead. Existing sound-on preferences use the new synthesis; saved silence preferences remain silent. Start or Preview unlocks browser audio; unavailable audio falls back to silence.

## Checks

```sh
npm test          # timing / zero phases / validation / completion boundary
npm run build    # strict TypeScript + production bundle
npm run test:e2e  # desktop/mobile browser interaction tests
```

Browser tests use system Chromium when available. Otherwise run `npx playwright install chromium` first, or set `CHROMIUM_PATH` to an installed browser executable. Tests start Vite automatically. Playwright downloads require access to its browser distribution domains.

Manual checks on your phone and desktop:

- Try all presets, zero holds, exact manual holds and the nonlinear hold sliders. Empty/invalid inputs block Start; numeric entries clamp to their phase bounds on blur.
- Watch water rise on inhale, hold full, fall on exhale, and hold empty. Each hold has a clockwise progress arc.
- Pause midway; the water, countdown, and phase stay fixed. Resume should continue from that point.
- Set a one-minute 4–7–8 session; it finishes after four complete cycles (76 seconds). Stop returns immediately to settings.
- Listen for distinct inhale/exhale cues and the shared hold cue. Muting and stopping must silence audio.
- Reload after changing settings; they should persist. Try private browsing or unavailable storage; the app must remain usable.
- Block `media/*.webp` in browser tools; the exercise must use its built-in gradient.
- Switch tabs; the session should pause. Try reduced motion in OS preferences.

## Structure and future work

- `src/engine.ts`: pure monotonic-time phase math, independently tested.
- `src/main.tsx`: idle/running/paused/completed state, settings, UI and pause policy.
- `src/audio.ts`: lookahead scheduling, prepared/recorded playback, phase fades, master volume and soft cancellation. `src/bowl-synth.ts`: the actual upstream struck-bowl model. `src/bowl-render.ts`: lossless preparation of its linear bowl/reverb signal before the session clock starts.
- `src/media.ts` and `public/media/manifest.json`: typed static media catalog, phase-role recordings, defaults, read-only media provider and separate access provider.
- `public/media/`: locally served original illustrative placeholders. `scripts/create-landscapes.py` reproduces them with Pillow; Python is not needed to run the app.

To change defaults or presets for this local version, edit `appDefaults` in `src/media.ts` or `presets` in `src/settings.ts`. Existing saved preferences take precedence until Reset defaults is clicked. To add photographs or recordings, follow the manifest instructions below. Set a photograph's `published: false` to remove it from selections; **this is not access control**—anything in `public/` remains publicly downloadable. Never place private or draft media there. Assets are selected once per session, with immediate repeats avoided in random mode.

### Version 1.1 scope

Implemented: configurable phases, zero-phase skipping, presets, duration, persistent settings/reset, static local scenery and gradient fallback, water fill, hold arc, synchronized clock/cues, volume/preview/silence, start/pause/resume/stop/exit, full-cycle completion, tab hiding policy, responsive layout, reduced wave motion, safety guidance, and no-account access.

Deferred to honor the direct request to avoid Supabase/external services: secure owner login, uploads and media CRUD, owner-managed recording upload interface, owner-managed defaults without deployment, remote publishing, database/RLS/storage policies. This MVP has no admin screen and no payment integration. Its catalog supports published images, but is bundled and requires deployment for updates. English, Hebrew (RTL), and Japanese are supported, with browser detection and a locally saved preference. Only the five approved real photographs are selectable; image-load failures use a built-in gradient.

For a future managed library, replace the read-only provider with an API serving only published assets and sound-role URLs (`inhale`, `hold`, `exhale`, optional `end`). Add authenticated server-side owner authorization and storage policies before enabling uploads; retain drafts in private storage. Add file validation, thumbnail generation, ordering and deletion reference checks. No secrets or service-role keys belong in browser code. Future paid entitlements must be checked by a trusted server, independently of the local session engine. No cloud provider was selected, so there is no recurring service subscription in this version; hosting bandwidth may still incur costs depending on deployment. Compare then-current storage limits/pricing before enabling managed storage.

## GitHub Pages — no local tools needed

The expected website is **https://TomerBreathWork.github.io/breathwork-app/**.

One-time repository setup on GitHub:

1. Open **Settings → Pages** in `TomerBreathWork/breathwork-app`.
2. Under **Build and deployment → Source**, select **GitHub Actions**. No branch or `/docs` folder is needed.
3. If Actions are disabled, enable them under **Settings → Actions → General**, allowing the official `actions/*` workflows. The workflow declares its required permissions; no personal access token or secret is needed.
4. Open **Actions → Deploy to GitHub Pages**. If the initial push ran before Pages was enabled, use **Run workflow**, select `main`, and run it (or rerun the failed deployment).
5. Wait for both **build** and **deploy** to turn green, then open the website above. Future pushes to `main` redeploy automatically. An environment approval, if configured on `github-pages`, must be approved in the Actions run.

For free hosting, keep this repository public and use GitHub Pages with GitHub-hosted Actions on that public repository. No paid storage, domain, APIs, or subscriptions are required. If the repository is private on a free plan, make it public only if you intend its source to be public; private-repository Pages availability depends on the GitHub plan. Organization policies may restrict Pages or Actions.

`vite.config.ts` sets `/breathwork-app/` for development and production. The local catalog uses Vite's base URL, so scripts, styles, and images load from the repository subdirectory. Build with `npm run build`; `.github/workflows/deploy-pages.yml` runs locked dependency installation, timing tests, the build, and deployment of `dist/`. No backend or environment variables are required.

To verify the built site under its real subpath locally:

```sh
npm run build
PLAYWRIGHT_TEST_PRODUCTION=1 npm run test:e2e
```

The browser tests start a production preview on port 5174 and exercise `/breathwork-app/`, including local images and CSS. For manual local preview, run `npm run preview` and open the printed address followed by `/breathwork-app/`.

## Current TEST audio: supplied MP3 samples

The TEST branch now uses the three supplied files in `public/media/audio/bowls/` through `src/sample-audio.ts`. `public/media/manifest.json` maps inhale and exhale to `low_F3_174Hz.mp3`, the first hold to `high_F4_349Hz.mp3`, and the second hold to `mid_C4_262Hz.mp3`. These are actual recordings, not replacement oscillator notes. Both existing non-silent settings play these samples; Advanced Options remain hidden.

All three samples preload/decode once before Start is enabled. Each nonzero phase schedules one independent, non-looping source using the existing integer-millisecond breathing boundaries. Its full eight-second sample may overlap later cues. There is no added phase fade, gate, crossfade or synthesis. Three-second preparation stays silent. Normal completion cancels future cues while allowing final tails to finish; Stop, Restart and leaving the practice cancel voices with a short de-click release. Pause freezes active sample offsets and resumes those tails smoothly, without another strike. Mute discards active tails and unmute enables subsequent phase cues only. Master volume is independent of source lifetimes. Missing files are skipped with a localized status; breathing continues without synthesized substitutes.

The new MP3s are included in the existing offline precache and retain GitHub Pages base-path handling. Original recordings, synthesis code and MIT notices remain on disk. The synthesis details below describe the retained legacy implementation, not the active TEST playback path. See `src/sample-audio.test.mjs` and `tests/sample-audio.spec.ts` for current behavior checks, including real MP3 decoding and a rendered overlap/completion test.

## Local photographs and recorded bowls

The photographs and current low/high/mid MP3 samples are registered in the manifest. Original recordings (`inhale 4.MP3`, `hold 4.MP3`, `exhale 4.MP3`) and synthesis remain on disk for future use. The existing illustrations remain on disk but are excluded from the interface and random selection. No service subscriptions or API credentials are needed.

You can add media in these folders and register it in the manifest. During TEST review, commit only to `feature/practice-library`; do not merge into or push `main`. Production remains unchanged until separately approved.

1. Put licensed JPG/JPEG/PNG/WebP photographs in `public/media/backgrounds/`. Prefer compressed WebP, about 1600–2000 pixels wide, preferably below 500 KB. Use simple ASCII filenames (spaces, dashes and underscores are supported).
2. Put licensed MP3/WAV/OGG recordings in `public/media/audio/`. MP3 is a broadly compatible choice for phones. Use soft, normalized recordings without harsh attacks. The current mapping is low F3 for inhale/exhale, high F4 for the first hold, and mid C4 for the second hold. Uploaded recordings keep their original pitches. No therapeutic frequency claims are made.
3. Edit `public/media/manifest.json`, for example:

```json
{
  "backgrounds": [
    {"id": "forest", "name": "Quiet forest", "description": "Morning light through trees", "file": "media/backgrounds/forest.webp"},
    {"id": "lake", "name": "Mountain lake", "file": "media/backgrounds/lake.jpg"}
  ],
  "recordings": {
    "inhale": "media/audio/bowls/low_F3_174Hz.mp3",
    "holdAfterInhale": "media/audio/bowls/high_F4_349Hz.mp3",
    "exhale": "media/audio/bowls/low_F3_174Hz.mp3",
    "holdAfterExhale": "media/audio/bowls/mid_C4_262Hz.mp3"
  }
}
```

Only register paths for files you have actually uploaded. Leave an unassigned audio role as `null`. Both hold roles may reference the same file; assign a separate `hold-after-exhale.mp3` later without changing code. IDs must be unique; `random`, `gradient`, `alpine` and `coast` are reserved. `npm run validate:media` checks paths, formats and file presence, and runs automatically during builds. The manifest is bundled at build time, so uploading files alone is insufficient: register them, commit, and wait for deployment.

When photographs are present, random sessions choose from those photographs and avoid an immediate repeat when possible. Only the five real photographs (`1.webp`–`5.webp`) are selectable or eligible for random sessions. Illustrations and the generated mountain lake remain on disk but are excluded. The chosen image stays fixed unless you change **Background** under Advanced Options. Failed session images use the gradient. All media URLs respect `/breathwork-app/`; no root-relative media URLs or runtime external requests are used. Only the displayed background loads, and browsers can cache the static assets. Settings remain stored in the browser.

**Audio behavior:** See the current TEST audio section above. Samples preload once, retain their own full attack and decay, and overlap without phase gates or loops. Missing/undecodable samples are skipped without blocking the exercise or substituting synthesis. Start, Resume and Unmute unlock audio through user interaction. Volume and visual preference changes do not restart voices or the breathing clock.

The tests cover exact role assignments, fractional boundaries, zero phases, independent source instances, natural overlap, preloading, duplicate prevention, master volume, mute, paused offsets and cleanup. Browser checks decode the actual MP3s and render a known-signal overlap test through the real Web Audio graph. Separate legacy synthesis tests remain to protect the retained implementation; they are not assertions about the active sample player. Final listening on a phone or headphones is still recommended at a comfortable volume.

## Retained synthesized singing bowls (inactive in TEST)

The retained legacy model prepares the original native Web Audio oscillator/reverb signal locally, with this former phase mapping:

| Phase | Note | Fundamental |
| --- | --- | --- |
| Inhale | G4 | 392.00 Hz |
| Hold after inhale | E4 | 329.63 Hz |
| Exhale | C4 | 261.63 Hz |
| Hold after exhale | E4 | 329.63 Hz |

Both holds share the same prepared E4 signal, including strike, detuning, resonance and room response. The reference's original randomness is generated once per note/page visit rather than again at every transition. `src/bowl-synth.ts` adapts the actual [Olivier Giulieri singing bowl implementation](https://github.com/evoluteur/tibetan-singing-bowls/blob/main/js/bowls.js), not the earlier softened approximation.

| Parameter | Upstream reference and current adaptation |
| --- | --- |
| Partial ratios | 1, 2.71, 5.15, 8.3 |
| Partial amplitudes | 1, 0.5, 0.26, 0.11 |
| Beat offsets (Hz, with original ±20% jitter) | 0.55, 1.3, 2.4, 3.7 |
| Exponential decay constants (seconds) | 3.4, 1.9, 1.1, 0.6 |
| Partial attack / strike output gain | 4 ms / 0.2 |
| Mallet transient | 30 ms cubic-decay noise; 2600 Hz bandpass, Q 0.8; gain 0.10 |
| Reverb | 35%; original stereo 3.6 s impulse, decay 2.6, low-pass factor 0.35 |
| Dry/wet gains | 0.8425 / 0.385 |
| Compressor | −16 dB threshold, ratio 6; standard Web Audio knee/attack/release |

The signal chain is original partials + mallet → original dry/reverb mix (prepared losslessly with OfflineAudioContext) → live volume → original compressor → **phase gate** → output. The gate is downstream of every effect, so neither reverb nor compressor delay can cross a phase boundary. At phase start it opens immediately; the upstream synthesis provides the attack. The final second fades everything to silence; short phases adapt proportionally. Cancellation still uses the existing short release, with new voices waiting for silence. Recorded-mode envelopes remain unchanged.

The existing 35% slider default is calibrated to the reference's 70% default (`0.7^1.6` before compression); endpoints remain silent/unity, and saved values and the UI are unchanged. Exact fundamentals replace upstream's random pitch drift. Original partial beating and mallet/impulse noise are retained. A shared impulse and three prepared stereo signals (about 31 MiB total at 48 kHz, plus the impulse and temporary rendering workspace) are cached for the page visit, not once per cycle. The original 24.3-second oscillator lifetime plus 3.6-second room tail is included; signals end naturally without looping, even during longer phases. Default playback performs no realtime oscillator, convolution or periodic-wave construction at phase boundaries.

Pause/resume seeks the same prepared signal, preserving oscillator beating, decay and reverb history without a new strike. A maximum 4 ms input de-click on resume avoids starting a mid-wave sample abruptly into the compressor; the post-effect gate also has a short resume release/attack. Fresh phases keep the original attack without a long fade-in. The lightweight playback graph is built before its start timestamp, with one render quantum of realtime lead while preserving the original phase deadline. No new libraries, paid services, UI, or media changes are needed.

**Artifact investigation:** a headless Chromium probe of the previous realtime factory measured oscillator starts 58–93 ms behind their requested timestamps, because impulse/convolver construction happened after choosing those timestamps. That could skip a 4 ms attack and begin midway through envelopes. Rebuilding the model on resume also selected different random detuning and discarded room history. Preparation and same-signal seeking address these reproducible problems. The upstream 30 ms bandpassed noise impact and noise-generated room impulse are intentional parts of its timbre; no extra noise generator runs continuously. They were retained, not removed with filtering. Browser renders did not show clipping at tested default/maximum C4 volume. These findings do not establish the cause of every reported device crackle or audio-driver interruption; listen on the actual target phone/headphones after deployment.

Attribution and the full MIT notice are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [the license file](third-party/tibetan-singing-bowls-LICENSE.txt). The production JavaScript retains the license notice. Tests include a separate extraction of the actual upstream strike/impulse/clink code; with identical randomness and exact pitch, offline browser renders match both the model and the prepared/live-compressor playback path within floating-point tolerance over the first two seconds, in stereo. This checks the initial impact and real signal chain, not just descriptive similarities.

Tests additionally verify all four note mappings, the same shared E4 signal for both holds, resumed decay, long/short/skipped phases, master independence, cancellation and node cleanup. Real browser offline audio renders check silence at every phase boundary, no clipping, and RMS levels matching the unchanged upstream reference for G4/C4/E4 over a four-second note. These signal checks support consistency; perceived warmth/loudness should also be checked on your phone or headphones at a comfortable volume.

## Breath Flow interface and languages

The existing application now uses a shared two-screen visual system: compact branding, teal/ivory glass panels, the existing presets plus a Custom selector, four duration sliders with editable numeric values, and an immersive exercise with a single remaining-session timer. All original preset values, the breathing engine, full-cycle completion, and original media are preserved. The water fill is constant during both holds; the wave is also paused, while the outer hold-progress arc continues clockwise. The current TEST audio uses low → high → low → mid MP3 cues; the breathing clock and water animation are unchanged. Musical note names are not displayed in the interface.

- `src/components/`: Brand, SettingsPanel, SessionPanel, BreathingCircle, AdvancedOptions and shared icons.
- `src/useBreathingSession.ts`: existing session-clock/audio integration, now shared with the redesigned controls. Changing sound settings never resets the breathing timer; unmute enables future cues without replaying old strikes. Preview during practice pauses the timer to avoid overlapping the preview with session audio; Resume continues the elapsed phase.
- `src/useSessionHistory.ts`: browser Back returns to settings and stops audio; it never auto-starts a session on Forward.
- `src/presets.ts`: the three built-in configurations and pure selection/edit/migration helpers. `src/settings.ts` restores language-independent media/audio preferences using the original `still-settings` key. Timing uses `src/launch-configuration.ts` defaults for new users and validated saved choices for returning users; Custom memory survives reloads.
- `src/locales/en.json`, `he.json`, `ja.json`: complete typed translation dictionaries. `src/i18n.ts` handles browser detection, persistence (`breath-flow-language`), document language/direction and named substitutions.
- [Translation review](docs/translations.md): every stable key with all three values. Regenerate with `node scripts/generate-translations.mjs`. Native-speaker review is welcome, especially for brand tone and Japanese phrasing.

Collapsed settings and active screens were checked at 360×740, 375×812 and 390×844 in all three languages, with no vertical or horizontal page overflow. Short phone layouts down to 320×568 also fit; unusually short/landscape layouts, enlarged text and explicitly expanded content use the app’s own scroll area rather than hiding controls. Safe-area insets and dynamic viewport units are used. System Georgia/serif, Hebrew, and Japanese fallback fonts avoid external font downloads. Real-device Safari/Android browser chrome and screen-reader behavior still merit manual checks.

### Original branding assets

The earlier interpretation assets in `public/branding/` are retained as unused originals. The supplied approved artwork in `public/brand/` now provides the actual header, icons and social image; see the offline/installation section below. The original generated mountain-lake background is a local compressed WebP (about 139 KB); none of the five uploaded photographs or two existing illustrative backgrounds was removed. Its manifest entry is unpublished and it is excluded from selection, along with both older illustrations. Settings always displays the real forest-stream photograph `3.webp`, independently of the saved session selection. A random session chooses only among `1.webp`–`5.webp`.

The favicon, Apple icon and web-app manifest use GitHub Pages-compatible paths. The current manifest and Workbox worker support standalone installation and offline caching. No splash screen is added within the application. English brand/attribution remain unchanged in every language. All functional text, statuses and accessibility labels are dictionary-based.

### UI verification

Run `npm test`, `npm run build`, and `PLAYWRIGHT_TEST_PRODUCTION=1 npm run test:e2e`. Existing engine/media/audio suites remain, with selectors updated for the new interface. Added tests cover translated controls and placeholders, all-language mobile fit, persisted/detected language, RTL with LTR clock/water geometry, holds, actual remaining time, restart, browser Back, expanded/small-screen usability, blank-field validation, mode/volume/background changes while running, preview/resume, and subpath branding assets. Browser tests capture mobile settings/session screenshots for each language under `/tmp/breath-flow-{en,he,ja}-{settings,session}.png`.

### Final background and branding adjustments

Settings always uses `public/media/backgrounds/3.webp`, even while selecting another session image and after Stop/reload. Active sessions support only the five uploaded real photos (`photo-1` through `photo-5`), plus random selection among those five. A saved legacy illustration/generated/gradient selection migrates to random without discarding the other settings. A built-in gradient remains an error fallback if an image fails; it is not a selectable background. Generated/illustrated files are retained, and the generated mountain-lake manifest entry is unpublished. Registering another image alone does not expose it: changing the approved set requires an explicit update to the five-photo policy in `src/media.ts`.

The Natural Brush Circle logo is centered above the app name, attribution and localized tagline, free-floating over the photograph with no surrounding branding panel. The small settings-only language selector sits in an upper corner. Collapsed phone layouts are verified in English, Hebrew and Japanese at 360×740, 375×812 and 390×844. The audio engine, animations and other session controls are unchanged.

### Silent preparation and final presentation

Start Practice now opens practice immediately with a separate three-second silent preparation: **Breathe Out Fully** (עברית: **נשפו את האוויר החוצה**; 日本語: **ゆっくり息を吐き切る**). Water descends from full to empty while 3→1 counts down. The selected session duration is untouched until normal breathing starts. Pause/Resume and tab hiding freeze this preparation clock; Restart includes it again; Stop cancels it. Sound preview is disabled throughout preparation. The unchanged synthesis is silently preloaded on Settings using a suspended context, then unlocked by Start/Preview. Start briefly displays the existing “Preparing audio…” state until the default bowl cache is ready; settings remain usable throughout. Preparation has a fixed three-second deadline independent of media loading. The normal clock carries any frame overshoot forward, so rendering does not extend preparation or accumulate timing drift. Audio plays only after the preparation deadline and readiness; exceptionally slow rendering or missing recordings can delay sound availability without delaying the breathing clock. Normal zero-duration phases remain skipped.

The mapping is **G4 (392 Hz) → E4 (329.63 Hz) → C4 (261.63 Hz) → E4 (329.63 Hz)**. Both hold phases use the identical prepared E4 signal; the reference synthesis algorithms and original strike/decay/fades are unchanged. Preparation is implemented in the session integration hook, not in the sound model.

Logos are approximately 17–18% larger with compact spacing preserved. Smaller branding text has a slightly stronger, localized shadow without a panel. Practice photographs use `--practice-background-opacity: 0.8` over warm ivory; settings retains its fixed `3.webp` with `--settings-background-opacity: 0.35`. Only image opacity changes, never the UI layers. Dedicated preparation tests verify all translations, three full seconds, falling water, frozen total time, silence (including preview/mute), actual first G4, pause/resume/restart/stop, opacity isolation, and normal session continuation.

### Coherent Breath, precision and full-cycle completion

- New users default to **Coherent Breathing** for a requested 3 minutes: 5.5-second inhale, no hold, 5.5-second exhale, no hold (11 seconds, approximately 5.45 cycles/minute). Returning users restore valid saved timing. Home has four localized preset choices: Coherent Breathing, Box Breathing, 4-7-8 and Custom, plus the optional Explore action.
- Inhale/exhale sliders and phase numeric inputs support 0.5-second steps; the hold sliders use the precision mapping below. Manual decimal input and saved fractional values remain fractional; the circle countdown shows only the initial fractional value, then stable whole seconds (5.5 → 5 → 4 → 3 → 2 → 1), with no zero between phases. The display does not alter phase timing. Current-launch fractional rhythms remain precise, with timing rounded to integer milliseconds.
- `engine.ts` sums integer phase milliseconds and rounds up to a whole number of cycles. A 60-second minimum yields 66 seconds for an 11-second cycle, 60 for 20, 64 for 16, and 63 for 10.5. Both final holds finish when configured; zero-length holds and their cues are skipped. No additional cycle/strike begins at completion.
- Start freezes a copy of the rhythm and calculated end time for that session. Background, volume and sound changes preserve it. Stop returns to the current launch’s settings; Restart includes preparation again. The timer includes the complete final cycle during preparation and only decreases once practice begins.
- Fresh launches and full user reloads restore validated saved timing, preset and Custom-memory values. In-app preset switches, Stop and browser Back preserve the current configuration. Language, background, sound and volume remain saved. Automatic PWA update reloads additionally use a tab-local one-time handoff to protect each tab’s own choices.
- A feathered cream/sand radial halo behind the free-floating teal branding creates the warm mist effect. The already enlarged enso is retained. Photography opacity remains independently adjustable at 0.35 for Settings and 0.8 for Practice. Secondary practice guidance remains available to screen readers while the visible practice layout focuses on the circle, round remaining timer and playback controls.

Regression coverage includes saved-setting migration, decimal entry/persistence, native oscillator mapping, six coherent cycles with exactly twelve G4/C4 strikes, silence during preparation, pause near the final boundary, and all four requested completion examples. Browser checks cover Settings, preparation and practice in English, Hebrew and Japanese on representative phone viewports. The reference bowl synthesis, original strike, resonance, effects, master volume, cancellation and final-second envelopes are retained; no new dependencies or deployment workflow were introduced.

### Settings presets, sharing, contact and help

Home has four primary preset choices: Coherent Breathing, Box Breathing, 4-7-8 and Custom. Explore remains an optional secondary action beside Advanced Options, opening the five-practice library. Shared practice data owns their defaults. Home manual edits select Custom when a named preset no longer matches; Details retains the chosen practice identity and marks adjusted timing. Custom memory and valid saved timing survive reloads; media/audio preferences and language remain saved.

Settings now has a small footer below Start Practice and its supporting sentence:

- **Share** invokes `navigator.share()` with the canonical public URL and a localized message. Unsupported or failed sharing offers Copy link. Clipboard permission/support failures leave a selectable read-only URL and localized manual-copy instructions. Cancelling native sharing stays quiet.
- **Contact** opens `https://wa.me/972509266969` in a new tab with the exact localized WhatsApp draft. It only prefills the message; the user reviews and sends it. There is no messaging API or automatic send.
- **How to Use** opens an accessible native dialog with the supplied English/Hebrew/Japanese instructions. Its body scrolls internally, keyboard focus stays within Close/content, Escape and Close dismiss it, and focus returns to the triggering button. Hebrew inherits RTL; the app name stays LTR.

Japanese breathing-circle labels remain **吸う → 止める → 吐く → 止める**. Japanese hides the after-inhale/exhale subtitle, and both Settings hold rows also use exactly 止める. Nonvisible numbered accessibility labels distinguish controls 2 and 4 while preserving their separate internal IDs. This is text presentation only: precise half-second timing, calm countdowns, three-second preparation, full-cycle completion, audio synthesis/mapping, hold-ring movement and stationary hold water remain unchanged.

`src/presets.ts` holds pure preset migration/edit/switch logic; `SettingsFooter.tsx`, `HelpDialog.tsx` and `links.ts` implement these actions using native browser APIs with no added dependency. Translation keys and all supplied help content are reviewed in `docs/translations.md`. Tests cover migrations, Custom memory, exact button order/one-row layout, localized native-share payloads, clipboard/manual fallbacks, cancellation, WhatsApp URLs/messages, modal focus/RTL and Japanese hold display. Native share-sheet appearance and installed WhatsApp handoff should also be checked on an actual phone; browser tests verify the API payloads and standard click-to-chat links without contacting anyone.

### Mobile viewport, Japanese labels and duration-control precision

The earlier Japanese fix affected Practice’s shared `hold` label and subtitle only. Settings independently used `holdIn` and `holdOut`, which still held longer phrases. All Japanese hold-related keys (`holdIn`, `holdOut`, `hold`, `afterInhale`, `afterExhale`) now use **止める**. Settings renders **吸う / 止める / 吐く / 止める**; ordinal accessibility names distinguish the two otherwise identical hold controls. The existing short help instructions and Practice label policy are retained.

The former intrinsic Settings height was about 684–688px at 360×640 and up to 695px at 320×568. Its `min-height: 100dvh` allowed the document to grow beyond the visible viewport. Fixed touch-control heights plus accumulated padding, header spacing and gaps caused this vertical overflow; the narrow Practice layout could also exceed its viewport. Text-entry fields below 16px could additionally trigger Safari focus zoom and apparent sideways panning.

The app now has an exact dynamic-viewport shell with safe-area padding. Container queries adapt actual available content height, reducing empty spacing/card padding before reducing the short-screen header/circle. All normal collapsed screens genuinely fit; the tests check the app’s own scroll dimensions and every essential control’s bounds, in addition to document dimensions. Document overscroll is contained after fitting the content. Help scrolls inside its dialog, Advanced Options has a bounded internal area, and exceptional large-text/short-landscape content remains reachable in the app’s own vertical scroll area. Text fields/selects have at least 16px text without disabling user zoom. Tabular, fixed-space countdowns and fixed numeric-field widths prevent value updates from moving controls.

`src/duration-controls.ts` separates duration from thumb position:

| Hold track position | Actual hold duration | Interaction increments |
| --- | --- | --- |
| 0–70% | 0–30 seconds | 0.5 seconds |
| 70–80% | 30–60 seconds | 2 seconds |
| 80–90% | 60–90 seconds | 5 seconds |
| 90–100% | 90–120 seconds | 10 seconds |

`sliderPositionToHoldDuration()` quantizes only slider interaction; `holdDurationToSliderPosition()` is continuous and never rounds the saved/manual duration. For example, a manual 31.5 seconds stays 31.5 with a 70.5% thumb position until the user moves the slider. Arrow keys select adjacent valid stops; Home/End select 0/120. Accessibility values remain seconds, even though the hold range element itself uses normalized 0–100 positions.

Inhale/exhale use linear 0.5–40-second sliders with 0.5-second steps. Numeric entries clamp to bounds on blur; temporary blank values remain editable and cannot start a session. Saved rhythms and Custom memory migrate to these bounds without losing fractional values. Timing carried across an automatic PWA update is validated against these bounds without resetting other preferences. Coherent Breath remains exactly 5.5/0/5.5/0. The generic timing/audio engine still supports its existing test rhythms; application configuration validates the new controls separately. Phase math, full-cycle completion, preparation, calm countdown formatting and audio synthesis/mapping are unchanged.

Browser checks cover Settings, preparation and Practice in English, Hebrew and Japanese at 320×568, 360×592, 360×640, 375×667, 375×812, 390×664, 390×844, 393×660 and 412×731, including viewport resizing, safe-area-like padding, no document panning, visible footer/playback controls, stable countdown layout, exact manual persistence, migration and nonlinear keyboard/pointer behavior. Touch-emulated taps at narrow phone sizes select short holds accurately. Native WebKit could not be installed because the download domains returned HTTP 403; physical Safari/browser-chrome behavior still requires a device check.

### Approved brand assets, installation and offline use

`public/brand/` contains the supplied **Breath_Flow_Brand_Assets.zip** artwork, copied byte-for-byte, including the preserved `original-logo-transparent.png`. The shared `Brand` header uses that original file; favicons, the Apple touch icon, normal PWA icons, the separate maskable icon and the 1200×630 social image use the supplied artwork. The older `public/branding/` files remain as unused originals. Do not redraw or regenerate the approved assets.

`index.html` includes canonical, Open Graph and Twitter large-image metadata in the initial HTML, with absolute public social URLs. `public/brand/app.webmanifest` starts and scopes the installed app to `/breathwork-app/`. The existing GitHub Pages workflow remains unchanged.

After deployment, open **https://tomerbreathwork.github.io/breathwork-app/** online and leave it open until **Advanced Options → “Saved for offline use on this device.”** appears (localized). The first download is approximately 9.7 MiB, including all five photographs, the three MP3 recordings, the synthesized audio engine, app bundles, icons and original logo. This status is shown only after the active worker confirms every precached file is present. A failed/partial installation does not claim readiness and retries when connectivity returns, on a visible-tab check, or on the next launch. No external fonts/CDNs are needed for practice.

For Android Chrome, use the browser’s **Install app / Add to Home screen** action. For iOS Safari, use **Share → Add to Home Screen**. There are no automatic install popups. The normal browser app also works offline after caching. Browser storage clearing, private-browsing policies, or OS eviction can remove offline data; reconnect and wait for the saved status again. Sharing to external apps and opening WhatsApp still depend on those apps/network availability.

`vite-plugin-pwa` builds the custom Workbox worker in `src/service-worker.ts`. `src/offline.ts` and `src/useOfflineSupport.ts` handle registration and session-aware updates. Development mode deliberately does not register a worker; test offline behavior with `npm run build` followed by `npm run preview`.

- HTML, hashed bundles and public media are revisioned and precached. Navigation under the exact app entry path uses the cached shell; unrelated Pages sites and URLs stay outside the worker’s scope.
- Registration checks on launch, online/visible events and every minute while visible download updates in the background. Each open tab must explicitly confirm it is idle before a waiting worker activates. Preparation, normal practice and **paused** practice all block activation. Unknown/suspended old clients also block, so close other app tabs if an update is waiting.
- Once every tab is idle, the update activates and idle pages reload once to display the new shell. A final guard defers reloading if practice starts during the activation handshake. Timers are never reset mid-practice. At completion or Stop, an outstanding update may load automatically. A one-use, tab-local `sessionStorage` handoff preserves that tab’s current timing and Custom memory across this automatic reload; other saved preferences remain in localStorage. A later user reload restores the latest validated saved choices.
- Workbox activation removes obsolete revisions/caches. No unconditional `skipWaiting`, auto-update reload, runtime external service or new hosting configuration is used.
- `scripts/validate-offline.mjs` runs after every build and rejects output if any essential file is missing from the generated precache. To add a future asset type, update the Vite glob if needed; files larger than the 10 MiB per-file limit must be handled explicitly rather than silently excluded.

Production verification: `PLAYWRIGHT_TEST_PRODUCTION=1 npm run test:e2e` includes real-service-worker tests for cold installation, failed-download recovery, offline reload/media decoding/synthesis/controls/locales/preferences, and two simulated deployments. They cover waiting through preparation/pause, multiple tabs, a last-moment Start race, full-cycle completion, replacement of the cached HTML and removal of its obsolete revision. Other application/network-mocking tests block service workers intentionally. Native home-screen installation and browser-managed social previews still need checks on real Android/iOS devices and the published URL; desktop Chromium cannot establish OS-specific installation behavior.

### Saved configuration and startup defaults

New users, or users without a valid saved configuration, start at **Coherent Breathing, 5.5 / 0 / 5.5 / 0, 3 requested minutes**. This produces 17 full 11-second cycles: **187 seconds (03:07)**, preceded by three silent preparation seconds.

The latest integrated update replaces the earlier reset-on-launch behavior: returning users restore their valid last preset, fractional durations, Custom memory and requested length. Retired preset IDs preserve their rhythm as Custom. Legacy long inhale/exhale durations clamp to 40 seconds. Invalid timing falls back safely. Language, audio, volume and background remain saved independently.

Within the app, Stop, Back and switching screens retain the current configuration. Automatic safe updates retain the tab’s own configuration through the validated one-use handoff; it takes precedence over another tab’s saved values. Background downloads never interrupt preparation, active or paused practice.

`tests/startup.spec.ts` verifies all three languages, migrated old settings, new documents, reloads, Custom memory, Stop/Back and the complete 187-second boundary. Production PWA tests cover offline saved settings, update preservation and tab isolation.

### Practice library — feature branch review

See [the review guide](docs/practice-library-review.md) for the optional library, shared Details, ratio controls, three-second preparation, route guidance, changed files and verification. Work stays on `feature/practice-library`. Tag `pre-practice-library` preserves production commit `1fe84e6`. Do not merge or deploy before explicit approval. The existing Pages workflow is unchanged and creates no automatic feature-branch preview.

### Current targeted TEST UI

See [the staged corrections](docs/test-corrections.md). Advanced Options are temporarily hidden on Home and Practice; the earlier sections describe their retained implementation. Current saved audio/background preferences remain in use. Home shows the selected rhythm above Start; Practice offers the speaker mute toggle. Preparation lasts three silent seconds. Energy is hidden from the filters and Box belongs only to Focus. No production deployment is authorized.
