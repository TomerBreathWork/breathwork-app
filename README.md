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

The app opens directly to settings. Choose an existing preset or Custom, set seconds with the sliders or numeric fields, and press **Start Practice**. A phase set to 0 is skipped. Use **Restart**, **Pause / Resume**, or **Stop** during practice. **Advanced Options**, collapsed by default on both screens, contains background, sound, mute, preview, and volume. **Reset defaults** is available there on settings. It restores Coherent Breath (5.5–0–5.5–0), with a requested minimum of 5 minutes. Language selection appears only on settings.

The requested session length is a minimum. Sessions complete a whole breathing cycle: `ceil(requestedMilliseconds / cycleMilliseconds) * cycleMilliseconds`; the countdown includes this extension from the start. Hiding the browser tab pauses safely and silences cues; resume manually on return. Refreshing ends a session, while keeping valid settings. Synthesized Tibetan Bowls is the default; it does not fetch audio files. You can select the existing recordings under Advanced Options. In recording mode, missing or undecodable files use per-role synthesis instead. Existing sound-on preferences use the new synthesis; saved silence preferences remain silent. Start or Preview unlocks browser audio; unavailable audio falls back to silence.

## Checks

```sh
npm test          # timing / zero phases / validation / completion boundary
npm run build    # strict TypeScript + production bundle
npm run test:e2e  # desktop/mobile browser interaction tests
```

Browser tests use system Chromium when available. Otherwise run `npx playwright install chromium` first, or set `CHROMIUM_PATH` to an installed browser executable. Tests start Vite automatically. Playwright downloads require access to its browser distribution domains.

Manual checks on your phone and desktop:

- Try all presets and a rhythm with only one nonzero phase. All-zero and out-of-range values must block Start.
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

## Local photographs and recorded bowls

The five uploaded photographs (`1.webp`–`5.webp`), an additional original generated mountain-lake scene (`breath-flow-lake.webp`), and three recordings (`inhale 4.MP3`, `hold 4.MP3`, `exhale 4.MP3`) are registered in the manifest. Both holds share the hold recording. The existing illustrations remain on disk but are excluded from the interface and random selection. Synthesized singing bowls are the default; recordings remain available as an alternative. No service subscriptions or API credentials are needed.

You can add media directly through GitHub's **Add file → Upload files** in these folders, then edit the manifest and commit to `main`. The existing Actions workflow rebuilds and deploys your updates.

1. Put licensed JPG/JPEG/PNG/WebP photographs in `public/media/backgrounds/`. Prefer compressed WebP, about 1600–2000 pixels wide, preferably below 500 KB. Use simple ASCII filenames (spaces, dashes and underscores are supported).
2. Put licensed MP3/WAV/OGG recordings in `public/media/audio/`. MP3 is a broadly compatible choice for phones. Use soft, normalized recordings without harsh attacks. The synthesis mapping is inhale G4 (392.00 Hz), first hold E4 (329.63 Hz), exhale C4 (261.63 Hz), second hold E4 (329.63 Hz). Uploaded recordings keep their original pitches. No therapeutic frequency claims are made.
3. Edit `public/media/manifest.json`, for example:

```json
{
  "backgrounds": [
    {"id": "forest", "name": "Quiet forest", "description": "Morning light through trees", "file": "media/backgrounds/forest.webp"},
    {"id": "lake", "name": "Mountain lake", "file": "media/backgrounds/lake.jpg"}
  ],
  "recordings": {
    "inhale": "media/audio/inhale.mp3",
    "holdAfterInhale": "media/audio/hold.mp3",
    "exhale": "media/audio/exhale.mp3",
    "holdAfterExhale": "media/audio/hold.mp3"
  }
}
```

Only register paths for files you have actually uploaded. Leave an unassigned audio role as `null`. Both hold roles may reference the same file; assign a separate `hold-after-exhale.mp3` later without changing code. IDs must be unique; `random`, `gradient`, `alpine` and `coast` are reserved. `npm run validate:media` checks paths, formats and file presence, and runs automatically during builds. The manifest is bundled at build time, so uploading files alone is insufficient: register them, commit, and wait for deployment.

When photographs are present, random sessions choose from those photographs and avoid an immediate repeat when possible. Only the five real photographs (`1.webp`–`5.webp`) are selectable or eligible for random sessions. Illustrations and the generated mountain lake remain on disk but are excluded. The chosen image stays fixed unless you change **Background** under Advanced Options. Failed session images use the gradient. All media URLs respect `/breathwork-app/`; no root-relative media URLs or runtime external requests are used. Only the displayed background loads, and browsers can cache the static assets. Settings remain stored in the browser.

**Audio behavior:** Start and Preview unlock audio through user interaction. Default synthesis renders the original bowl/reverb signal locally before the first session, then reuses it with live volume and the original compressor; no audio download or post-phase tail is involved. First preparation can take a few seconds, using the existing Preparing audio indicator; later sessions reuse the cached signals. Selecting recording mode preloads/decodes assigned files and caches them for this page visit. Missing or unsupported recordings fall back individually to the new synthesis. Settings reports the active mode or fallback. Autoplay/API failure leaves the exercise silent. Recordings never loop: short files end naturally, and long files stop at their phase boundary. Synthesized strikes keep the original 4 ms attack; recordings keep their 150 ms fade-in. Both fade out over the final second, with proportional fades for short phases. Each phase reaches zero before the next starts. There is no crossfade. A separate master gain controls volume without resetting those envelopes.

Pause/stop/exit cancel the scheduler and queued sources and release active audio over at most 50 ms. Resume/unmute re-envelope the current phase from its elapsed offset. Synthesized partial decay and oscillator phase resume at the elapsed offset, preserving the beating pattern without a new mallet strike. Recordings seek to that offset; a recording that already ended stays silent. Newly started audio waits for any cancellation release to finish, so rapid controls do not cause overlap. Background changes do not restart audio or the breathing clock. Session completion cancels all further cues. Tab hiding still pauses safely.

The pure timing/audio tests include short/long phases, four role assignments, zero phases, no looping/overlap, independent master volume, cancellation, and resumed offsets. Browser tests cover the existing UI, image selection/randomness, controls and GitHub Pages paths. A separate browser test bundles the actual audio engine into a test-only harness, decodes temporary WAV responses, and renders the Web Audio graph offline to measure silence at phase boundaries. Those test WAVs are never shipped as app media. For final subjective loudness and mobile codec checks, preview your own recordings on the deployed site.

## Synthesized singing bowls

The default prepares the original native Web Audio oscillator/reverb model locally, with this exact phase mapping:

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

Tests additionally verify all four note mappings, the same shared E4 signal for both holds, resumed decay, long/short/skipped phases, master independence, cancellation and node cleanup. Real browser offline audio renders check silence at every phase boundary, no clipping, and RMS levels matching the unchanged upstream reference for G4/C4/E4 over a five-second note. These signal checks support consistency; perceived warmth/loudness should also be checked on your phone or headphones at a comfortable volume.

## Breath Flow interface and languages

The existing application now uses a shared two-screen visual system: compact branding, teal/ivory glass panels, the existing presets plus a Custom selector, four duration sliders with editable numeric values, and an immersive exercise with a single remaining-session timer. All original preset values, the breathing engine, full-cycle completion, and original media are preserved. The water fill is constant during both holds; the wave is also paused, while the outer hold-progress arc continues clockwise. The current audio engine and G4 → E4 → C4 → E4 mapping are unchanged. Musical note names are not displayed in the interface.

- `src/components/`: Brand, SettingsPanel, SessionPanel, BreathingCircle, AdvancedOptions and shared icons.
- `src/useBreathingSession.ts`: existing session-clock/audio integration, now shared with the redesigned controls. Changing sound mode joins the current phase without resetting the timer. Preview during practice pauses the timer to avoid overlapping the preview with session audio; Resume continues the elapsed phase.
- `src/useSessionHistory.ts`: browser Back returns to settings and stops audio; it never auto-starts a session on Forward.
- `src/presets.ts`: the three built-in configurations and pure selection/edit/migration helpers. `src/settings.ts` restores preferences using the original `still-settings` key, including saved Custom durations.
- `src/locales/en.json`, `he.json`, `ja.json`: complete typed translation dictionaries. `src/i18n.ts` handles browser detection, persistence (`breath-flow-language`), document language/direction and named substitutions.
- [Translation review](docs/translations.md): every stable key with all three values. Regenerate with `node scripts/generate-translations.mjs`. Native-speaker review is welcome, especially for brand tone and Japanese phrasing.

Collapsed settings and active screens were checked at 360×740, 375×812 and 390×844 in all three languages, with no vertical or horizontal page overflow. Smaller screens (e.g. 320×568), landscape, enlarged text, and expanded Advanced Options can scroll rather than hiding controls. Safe-area insets and dynamic viewport units are used. System Georgia/serif, Hebrew, and Japanese fallback fonts avoid external font downloads. Real-device Safari/Android browser chrome and screen-reader behavior still merit manual checks.

### Original branding assets

`public/branding/brush-circle.svg` is an original organic enso-style brush circle; `app-icon.svg` uses a light brush circle on deep teal. PNG exports include 192px, 512px and an Apple touch icon. These are clean original interpretations of the requested Natural Brush concept: no mockup/reference image was supplied for exact visual comparison, so later brand refinement may be useful. The original generated mountain-lake background is a local compressed WebP (about 139 KB); none of the five uploaded photographs or two existing illustrative backgrounds was removed. Its manifest entry is unpublished and it is excluded from selection, along with both older illustrations. Settings always displays the real forest-stream photograph `3.webp`, independently of the saved session selection. A random session chooses only among `1.webp`–`5.webp`.

The favicon, Apple icon and small web-app manifest use GitHub Pages-compatible paths. The web manifest supplies icons, scope and standalone display metadata only; no new PWA framework, service worker, splash screen or offline caching system was introduced. English brand/attribution remain unchanged in every language. All functional text, statuses and accessibility labels are dictionary-based.

### UI verification

Run `npm test`, `npm run build`, and `PLAYWRIGHT_TEST_PRODUCTION=1 npm run test:e2e`. Existing engine/media/audio suites remain, with selectors updated for the new interface. Added tests cover translated controls and placeholders, all-language mobile fit, persisted/detected language, RTL with LTR clock/water geometry, holds, actual remaining time, restart, browser Back, expanded/small-screen usability, blank-field validation, mode/volume/background changes while running, preview/resume, and subpath branding assets. Browser tests capture mobile settings/session screenshots for each language under `/tmp/breath-flow-{en,he,ja}-{settings,session}.png`.

### Final background and branding adjustments

Settings always uses `public/media/backgrounds/3.webp`, even while selecting another session image and after Stop/reload. Active sessions support only the five uploaded real photos (`photo-1` through `photo-5`), plus random selection among those five. A saved legacy illustration/generated/gradient selection migrates to random without discarding the other settings. A built-in gradient remains an error fallback if an image fails; it is not a selectable background. Generated/illustrated files are retained, and the generated mountain-lake manifest entry is unpublished. Registering another image alone does not expose it: changing the approved set requires an explicit update to the five-photo policy in `src/media.ts`.

The Natural Brush Circle logo is centered above the app name, attribution and localized tagline, free-floating over the photograph with no surrounding branding panel. The small settings-only language selector sits in an upper corner. Collapsed phone layouts are verified in English, Hebrew and Japanese at 360×740, 375×812 and 390×844. The audio engine, animations and other session controls are unchanged.

### Silent preparation and final presentation

Start Practice now opens practice immediately with a separate five-second silent preparation: **Breathe Out Fully** (עברית: **נשפו את האוויר החוצה**; 日本語: **ゆっくり息を吐き切る**). Water descends from full to empty while 5→1 counts down. The selected session duration is untouched until normal breathing starts. Pause/Resume and tab hiding freeze this preparation clock; Restart includes it again; Stop cancels it. Sound preview is disabled throughout preparation. The unchanged synthesis is silently preloaded on Settings using a suspended context, then unlocked by Start/Preview. Start briefly displays the existing “Preparing audio…” state until the default bowl cache is ready; settings remain usable throughout. Preparation has a fixed five-second deadline independent of media loading. The normal clock carries any frame overshoot forward, so rendering does not extend preparation or accumulate timing drift. Audio plays only after the preparation deadline and readiness; exceptionally slow rendering or missing recordings can delay sound availability without delaying the breathing clock. Normal zero-duration phases remain skipped.

The mapping is **G4 (392 Hz) → E4 (329.63 Hz) → C4 (261.63 Hz) → E4 (329.63 Hz)**. Both hold phases use the identical prepared E4 signal; the reference synthesis algorithms and original strike/decay/fades are unchanged. Preparation is implemented in the session integration hook, not in the sound model.

Logos are approximately 17–18% larger with compact spacing preserved. Smaller branding text has a slightly stronger, localized shadow without a panel. Practice photographs use `--practice-background-opacity: 0.8` over warm ivory; settings retains its fixed `3.webp` with `--settings-background-opacity: 0.35`. Only image opacity changes, never the UI layers. Dedicated preparation tests verify all translations, five full seconds, falling water, frozen total time, silence (including preview/mute), actual first G4, pause/resume/restart/stop, opacity isolation, and normal session continuation.

### Coherent Breath, precision and full-cycle completion

- New users default to **Coherent Breath**: 5.5-second inhale, no hold, 5.5-second exhale, no hold (11 seconds, approximately 5.45 cycles/minute). Its button label is Coherent Breath in every language. The four buttons are Coherent Breath, Box Breath, 4-7-8 and Custom, in one row. The former Slow & Steady configuration migrates to Custom with its durations preserved.
- All phase sliders and numeric fields use 0.5-second steps. Manual decimal input and saved fractional values remain fractional; the circle countdown shows only the initial fractional value, then stable whole seconds (5.5 → 5 → 4 → 3 → 2 → 1), with no zero between phases. The display does not alter phase timing. Existing finer saved rhythms remain usable, with timing rounded to integer milliseconds.
- `engine.ts` sums integer phase milliseconds and rounds up to a whole number of cycles. A 60-second minimum yields 66 seconds for an 11-second cycle, 60 for 20, 64 for 16, and 63 for 10.5. Both final holds finish when configured; zero-length holds and their cues are skipped. No additional cycle/strike begins at completion.
- Start freezes a copy of the rhythm and calculated end time for that session. Background, volume and sound changes preserve it. Stop returns to saved settings; Restart includes preparation again. The timer includes the complete final cycle during preparation and only decreases once practice begins.
- Saved explicit rhythms (including legacy settings without a preset ID) keep their values. An explicit Custom choice now persists even if its numbers match a preset. If no saved valid rhythm exists, only the rhythm defaults to Coherent Breath; other valid preferences are retained.
- A feathered cream/sand radial halo behind the free-floating teal branding creates the warm mist effect. The already enlarged enso is retained. Photography opacity remains independently adjustable at 0.35 for Settings and 0.8 for Practice. Secondary practice guidance remains available to screen readers while the visible practice layout focuses on the circle, round remaining timer and playback controls.

Regression coverage includes saved-setting migration, decimal entry/persistence, native oscillator mapping, six coherent cycles with exactly twelve G4/C4 strikes, silence during preparation, pause near the final boundary, and all four requested completion examples. Browser checks cover Settings, preparation and practice in English, Hebrew and Japanese on representative phone viewports. The reference bowl synthesis, original strike, resonance, effects, master volume, cancellation and final-second envelopes are retained; no new dependencies or deployment workflow were introduced.

### Settings presets, sharing, contact and help

The four preset buttons have exactly the same names in all languages: **Coherent Breath**, **Box Breath**, **4-7-8**, **Custom**. Their existing internal IDs remain stable to restore saved choices. The configurations are 5.5/0/5.5/0, 4/4/4/4 and 4/7/8/0. Manual edits select Custom only when the current named preset no longer matches; a separate `customRhythm` field in the existing `still-settings` JSON remembers Custom across switches and reloads. Retired or unknown saved preset IDs become Custom without losing durations, session length, sound, volume or background. Language remains in its existing preference key.

Settings now has a small footer below Start Practice and its supporting sentence:

- **Share** invokes `navigator.share()` with the canonical public URL and a localized message. Unsupported or failed sharing offers Copy link. Clipboard permission/support failures leave a selectable read-only URL and localized manual-copy instructions. Cancelling native sharing stays quiet.
- **Contact** opens `https://wa.me/972509266969` in a new tab with the exact localized WhatsApp draft. It only prefills the message; the user reviews and sends it. There is no messaging API or automatic send.
- **How to Use** opens an accessible native dialog with the supplied English/Hebrew/Japanese instructions. Its body scrolls internally, keyboard focus stays within Close/content, Escape and Close dismiss it, and focus returns to the triggering button. Hebrew inherits RTL; the app name stays LTR.

Japanese breathing-circle labels remain **吸う → 止める → 吐く → 止める**. Only Japanese hides the longer after-inhale/exhale subtitle; Settings keeps distinguishable accessible phase-control labels. This is text presentation only: precise half-second timing, calm countdowns, five-second preparation, full-cycle completion, audio synthesis/mapping, hold-ring movement and stationary hold water remain unchanged.

`src/presets.ts` holds pure preset migration/edit/switch logic; `SettingsFooter.tsx`, `HelpDialog.tsx` and `links.ts` implement these actions using native browser APIs with no added dependency. Translation keys and all supplied help content are reviewed in `docs/translations.md`. Tests cover migrations, Custom memory, exact button order/one-row layout, localized native-share payloads, clipboard/manual fallbacks, cancellation, WhatsApp URLs/messages, modal focus/RTL and Japanese hold display. Native share-sheet appearance and installed WhatsApp handoff should also be checked on an actual phone; browser tests verify the API payloads and standard click-to-chat links without contacting anyone.
