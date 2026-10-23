# Still — breathing, simply

A free React + TypeScript + Vite breathing app. No registration, credentials, paid APIs, or runtime external requests. All preferences stay in this browser. Local original WebP landscape illustrations and synthesized bowl-style fallback audio are included. Local photographs and recordings can be registered in the media manifest.

## Preview

Requires Node.js 22.12+ (Node 24 recommended) and npm.

```sh
cd /workspace/breathwork-app
npm ci
npm run dev
```

Open the address Vite prints in your browser (normally port 5173, under `/breathwork-app/`). In a cloud editor, use its port preview for port 5173 if available. To test the production version, run `npm run build` then `npm run preview` (port 4173). Production files are in `dist/`.

Choose a preset or enter your own seconds; 0 skips a phase entirely. Start opens the scenic exercise. Try pause/resume, mute, stop, and the × button. Under **Atmosphere & sound**, choose a fixed background, random scenery, a gradient, volume, or silence. Preview plays a sample bowl. Use **Reset defaults** to return to 4–0–6–0 for 5 minutes.

The session completes at the end of the phase containing the target duration; the countdown includes this extension. Hiding the browser tab pauses safely and silences cues; resume manually on return. Refreshing ends a session, while keeping valid settings. When no recordings are assigned, sound is synthesized locally, not a recording of an actual Tibetan bowl. Assigned recordings take priority, with per-role synthesis on load/decode failure. Start or Preview unlocks browser audio; unavailable audio falls back to silence.

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
- Set a one-minute 4–7–8 session; it finishes after 61 seconds. Stop and × return immediately to settings.
- Listen for distinct inhale/exhale cues and the shared hold cue. Muting and stopping must silence audio.
- Reload after changing settings; they should persist. Try private browsing or unavailable storage; the app must remain usable.
- Block `media/*.webp` in browser tools; the exercise must use its built-in gradient.
- Switch tabs; the session should pause. Try reduced motion in OS preferences.

## Structure and future work

- `src/engine.ts`: pure monotonic-time phase math, independently tested.
- `src/main.tsx`: idle/running/paused/completed state, settings, UI and pause policy.
- `src/audio.ts`: recorded phase playback, lookahead Web Audio scheduling, per-phase fades, independent master gain, soft cancellation and synthesized fallback.
- `src/media.ts` and `public/media/manifest.json`: typed static media catalog, phase-role recordings, defaults, read-only media provider and separate access provider.
- `public/media/`: locally served original illustrative placeholders. `scripts/create-landscapes.py` reproduces them with Pillow; Python is not needed to run the app.

To change defaults or presets for this local version, edit `appDefaults` in `src/media.ts` or `presets` in `src/main.tsx`. Existing saved preferences take precedence until Reset defaults is clicked. To add photographs or recordings, follow the manifest instructions below. Set a photograph's `published: false` to remove it from selections; **this is not access control**—anything in `public/` remains publicly downloadable. Never place private or draft media there. Assets are selected once per session, with immediate repeats avoided in random mode.

### Version 1.1 scope

Implemented: configurable phases, zero-phase skipping, presets, duration, persistent settings/reset, static local scenery and gradient fallback, water fill, hold arc, synchronized clock/cues, volume/preview/silence, start/pause/resume/stop/exit, end-of-phase completion, tab hiding policy, responsive layout, reduced wave motion, safety guidance, and no-account access.

Deferred to honor the direct request to avoid Supabase/external services: secure owner login, uploads and media CRUD, owner-managed recording upload interface, owner-managed defaults without deployment, remote publishing, database/RLS/storage policies. This MVP has no admin screen and no payment integration. Its catalog supports published images, but is bundled and requires deployment for updates. The first UI is English; Hebrew/RTL remains a future localization option from the document's open decisions. The shipped fallback backgrounds remain illustrations; real photographs can now be added through the manifest.

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

No photographs or recorded bowls have been uploaded yet. The existing illustrations and synthesized sounds remain functional fallbacks. No service subscriptions or API credentials are needed.

You can add media directly through GitHub's **Add file → Upload files** in these folders, then edit the manifest and commit to `main`. The existing Actions workflow rebuilds and deploys your updates.

1. Put licensed JPG/JPEG/PNG/WebP photographs in `public/media/backgrounds/`. Prefer compressed WebP, about 1600–2000 pixels wide, preferably below 500 KB. Use simple ASCII filenames (spaces, dashes and underscores are supported).
2. Put licensed MP3/WAV/OGG recordings in `public/media/audio/`. MP3 is a broadly compatible choice for phones. Use soft, normalized recordings without harsh attacks. Musical references: inhale C4 (261.63 Hz), hold E4 (329.63 Hz), exhale G3 (196 Hz); no therapeutic frequency claims are made.
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

When photographs are present, random sessions choose from those photographs and avoid an immediate repeat when possible. Fallback illustrations remain selectable. The chosen image stays fixed unless you change **Scenery** in the session header. Failed session images use the gradient. All media URLs respect `/breathwork-app/`; no root-relative media URLs or runtime external requests are used. Only the displayed background loads, and browsers can cache the static assets. Settings remain stored in the browser.

**Audio behavior:** Start and Preview unlock audio and preload/decode assigned recordings, caching them for this page visit. Missing or unsupported recordings fall back individually to synthesized bowls; Settings reports whether playback uses recordings, partial fallback, or full fallback. Autoplay/API failure leaves the exercise silent. Sources never loop. Short recordings end naturally; long recordings stop at their phase boundary. Phase envelopes fade in for up to 150 ms and fade out over the final second; phases under two seconds use proportional fades. Each phase reaches zero before the next starts. There is no crossfade. A separate master gain controls volume without resetting those envelopes.

Pause/stop/exit cancel the scheduler and queued sources and release active audio over at most 50 ms. Resume/unmute seek to the current phase offset and re-envelope its remaining time; a recording that already ended stays silent. Newly started audio waits for any cancellation release to finish, so rapid controls do not cause overlap. Background changes do not restart audio or the breathing clock. Session completion cancels all further cues. Tab hiding still pauses safely.

The pure timing/audio tests include short/long phases, four role assignments, zero phases, no looping/overlap, independent master volume, cancellation, and resumed offsets. Browser tests cover the existing UI, image selection/randomness, controls and GitHub Pages paths. A separate browser test bundles the actual audio engine into a test-only harness, decodes temporary WAV responses, and renders the Web Audio graph offline to measure silence at phase boundaries. Those test WAVs are never shipped as app media. For final subjective loudness and mobile codec checks, preview your own recordings on the deployed site.
