# Practice library — review before production

Work branch: **feature/practice-library**. Nothing is authorized to merge or deploy yet. The existing deployment workflow only runs for pushes to `main`; it is unchanged.

## Rollback point

The annotated tag **pre-practice-library** preserves verified production commit **1fe84e6dabe810d60b58f1798530a1c171f2d608**. The starting working tree was clean. Baseline automated tests and production build passed before application changes. The tag was pushed; no history was rewritten or force-pushed.

## Review the experience

Home keeps its original logo/branding, fixed forest photo, glow, four duration controls, direct Start, Advanced Options and footer. Its four primary presets are Coherent Breathing, Box Breathing, 4-7-8 and Custom. Explore Breathing Practices remains an optional secondary action beside Advanced Options, preserving mobile height.

Explore is optional. All five cards appear initially. Calm, Energy and Focus & Balance filter overlapping categories without duplicating definitions. Card summaries stay one line; Details provides the complete text. Small screens scroll the list internally.

Every card opens the same Details component: explanation, possible benefits, suggested use cases, default timings, appropriate adjustment controls, quick 3/5/10-minute choices, a 1–120-minute numeric session field, comfort note and direct Start. Its body scrolls internally while Back and Start remain accessible. The copy makes no therapeutic promises or predictions about feelings.

| Practice | Initial in / hold / out / hold | Adjustment | In / out route |
| --- | --- | --- | --- |
| Coherent Breathing | 5.5 / 0 / 5.5 / 0 | Equal inhale/exhale | Nose / nose |
| Box Breathing | 4 / 4 / 4 / 4 | One common duration | Nose / nose |
| 1:1 Breathing | 4.5 / 0 / 4.5 / 0 | Exhale equals inhale | Nose / nose |
| Extended Exhale (1:2) | 4 / 0 / 8 / 0 | Exhale twice inhale | Nose / nose |
| 4-7-8 Breathing | 4 / 7 / 8 / 0 | Independent phases; optional holds | Nose / mouth |

Coupled guided controls use 0.5-second increments and a compact 0.5–10-second base range. Derived exhale stays exact. Home Custom retains the existing 0.5–40-second inhale/exhale and nonlinear 0–120-second holds. Details edits keep the selected practice name and show an adjusted-rhythm note. All suggested values are starting points; shortening or removing holds is explicitly supported.

Start on Details uses the existing engine directly. Stop returns to Details with the same selected practice and timings. Back returns through Library to Home, preserving configuration and filter selection. Home direct Start/Stop retains its behavior. Browser Forward restores valid screens without starting sessions or audio.

New users start with Coherent, 5.5/0/5.5/0 and 3 requested minutes. The latest integrated request supersedes the earlier reset-on-launch rule: returning users restore their valid last preset, fractional configuration, Custom memory and session length. Legacy rhythms are migrated safely to the current bounds. Language, background, sound and volume remain saved. Automatic PWA update reloads preserve the tab’s own selected practice and timing through the existing one-use handoff, taking precedence over another tab’s saved settings.

## Timing, routes and audio

`src/preparation.ts` defines **three silent seconds** for all starts/restarts. Preparation lowers water high-to-low, pauses/resumes correctly and does not reduce session duration. Default Coherent still finishes 17 full cycles: **187 breathing seconds (03:07)** plus three preparation seconds.

The synthesis graph and **G4 / E4 / C4 / E4** assignments are unchanged. Zero-duration phases skip their sounds; original strike/resonance, final-second fades and no crossfade remain. Water rises/falls normally and stays stationary during holds. Thin, original frontal-nose/neutral-lips SVGs and translated route text appear only during running inhale/exhale, not preparation, holds, pause or completion. Their reserved row avoids countdown movement.

Practice data owns defaults, translation keys, categories, ratios, customization modes and routes. Existing preset helpers derive their three configurations from this single source; launch timing derives from Coherent too. No new dependency, routing framework, backend or external service was introduced.

## Changed files

- Data/timing/navigation: `src/practices.ts`, `preparation.ts`, `navigation.ts`, `useAppNavigation.ts`; updated `main.tsx`, `useBreathingSession.ts`, `presets.ts`, `launch-configuration.ts`.
- New/shared components: `BreathingControls.tsx`, `PracticeLibrary.tsx`, `PracticeDetails.tsx`, `CategoryIcon.tsx`, `BreathRouteIcon.tsx`; updated `SettingsPanel.tsx`, `SessionPanel.tsx`, `BreathingCircle.tsx` and `src/style.css`.
- Copy: `src/locales/{en,he,ja}.json`, generated `docs/translations.md`.
- Tests: new `src/practices.test.mjs`, `tests/practice-library.spec.ts`; updated launch-handoff test, shared configuration helper and existing app/countdown/mobile/preparation/PWA/refinement/settings-footer/startup/UI suites.
- Documentation: this guide and README.

Approved logo, images, MP3s, audio synthesis, manifest/social metadata, cache policy and production workflow are retained.

## Preview and checks

```sh
git fetch origin
git switch feature/practice-library
npm ci
npm test
npm run build
npm run preview -- --port 5173 --strictPort
```

Open the workspace **port 5173 preview** at `/breathwork-app/`. On the preview machine, the URL is `http://localhost:5173/breathwork-app/`. This is a local preview, not a public deployment. GitHub Pages does not create automatic feature-branch previews.

Run browser validation with `PLAYWRIGHT_TEST_PRODUCTION=1 npm run test:e2e -- --workers=2`. Dedicated PWA tests use real service workers and include opening the library and starting from Details offline. Network-mocking tests intentionally block workers.

New library/Details checks cover English, Hebrew RTL and Japanese at **320×568, 360×640, 375×812, 390×844 and 1280×900**. The previous nine-size Home/Practice matrix remains. Details and card lists may scroll internally; collapsed Home/Practice fit normal mobile viewports. Large text and exceptional short/landscape screens retain accessible app scrolling.

Review translations, personal pacing, and small nose/mouth icon legibility on actual phones. Physical iOS/Android installation and browser chrome still need device checks; Chromium cannot establish every native-browser behavior.

## Approval and merge

Review the branch comparison and open a pull request **from feature/practice-library into main**. Do not merge yet. Only after explicit approval, merge the reviewed commit through that PR. The existing main-branch Actions workflow will then deploy. Until approval, leave main and Pages settings unchanged. The rollback tag remains available for a reviewed restoration; a tag alone does not deploy or roll back the live site.

## Validation recorded for this branch

- Baseline: stable `main` automated tests and production build passed before the rollback tag was created.
- Latest integrated update: 50 unit/data/audio/timing tests passed.
- Latest full production browser regression: 109 tests passed.
- Focused integrated mobile/library/PWA/footer suite: 39 tests passed. The full suite includes 200% text and short-landscape reachability.
- Production TypeScript/Vite build passed with exit code 0; all 32 required static entries remain precached.
- Mobile screenshots were captured and inspected for Home, Library, Details, controls and active practice in all three languages.
- Audio synthesis, main phase engine, approved media/branding, manifest/social metadata, dependencies and Pages workflow compare unchanged against the rollback commit.

## Integrated update on the same branch

The supplied `Breath_Flow_Brand_Assets.zip` was inspected. All 11 entries, including the original transparent logo, SVG/ICO/PNG favicons, 180px Apple icon, PWA icons, maskable icon and 1200×630 social image, match `public/brand/` byte for byte. No artwork was regenerated. Existing image-only opacity variables (Settings 0.35, Practice 0.8), enlarged centered logo, bold byline, feathered header glow and five-photo selection remain intact. The tagline now stays English in every locale, as required by the integrated request.

How to Use adds the supplied Safety Guidelines and integrated medical disclaimer in all three languages, separated by a subtle divider. The earlier redundant discomfort paragraph was consolidated into this section. No popup or checkbox was introduced. English, Hebrew RTL and Japanese help use the same accessible, internally scrolling native dialog. Japanese phase labels remain 吸う → 止める → 吐く → 止める.

The three-second preparation uses the existing shared clock without changing audio, water, full-cycle calculations or paused/session state. Regression tests assert silence until its deadline, frozen total time, translated instruction, high-to-low water, restart/pause/resume/stop and the first G4. The unchanged oscillator frequencies remain G4 392, E4 329.63, C4 261.63, E4 329.63 Hz.

New saved-configuration tests cover all three primary patterns, Custom, retired IDs, invalid data, fractional values, bounds migration and retained library identity. Updated browser tests cover reload persistence, the four-button row, safety translations and three-second timing while retaining the existing audio, PWA/offline and mobile checks.

Existing `public/brand/app.webmanifest` already provides the requested manifest values; its filename and URLs are retained to preserve installed clients. Initial HTML metadata, all supplied brand files, service-worker update policy and production workflow require no changes.

The existing immutable public preview is a previous snapshot, not an automatic feature-branch deployment. There is no safe preview-update workflow attached to this source branch. The current changes can be reviewed locally using `npm ci`, `npm run build`, then `npm run preview -- --port 5173`; the path is `/breathwork-app/`. A localhost URL requires a browser on the same machine or an actual port-forwarding feature. It is not a public phone-accessible link. Do not merge into `main` or publish production without explicit approval.

Latest mobile validation covers Home, Preparation and Practice at 320×568, 360×592, 360×640, 375×667, 375×812, 390×664, 390×844, 393×660 and 412×731 in English, Hebrew and Japanese. Additional library/details checks include desktop 1280×900. Final screenshots in all three locales and Hebrew Safety Guidelines were captured and inspected; no page errors were recorded. Physical-device installation/social preview verification remains manual.
