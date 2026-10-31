# Breath Flow analytics

The production bundle uses the public GA4 Measurement ID **G-9GMF53JNC3** from `src/analytics.ts`. No environment secret, extra dependency, backend or workflow change is required. Vite development mode does not load Google; a production preview behaves like a production build, so use the test mocks or decline analytics during local reviews.

## Required GA4 web-stream setting

In **Admin → Data streams → the Breath Flow web stream**, switch **Enhanced measurement OFF** before publishing this integration. Keep it off unless this data flow is reviewed again. Its automatic browser-history views can duplicate our manual views, and automatic outbound-link events can include the WhatsApp URL, phone number and prefilled message. Those values are explicitly excluded from this integration. The repository cannot read or enforce the account-side switch; owner confirmation is required before deployment.

`send_page_view: false` prevents the tag's automatic initial page view. It is not a substitute for reviewing the web stream's Enhanced Measurement setting. GA4's built-in first-visit, session and engagement collection remains responsible for user/session/retention reporting; we do not generate user IDs or calculate unique users ourselves.

## Consent and privacy

The shield button on Settings opens analytics preferences. A first-visit, dismissible notice offers equally accessible Allow and Decline choices in English, Hebrew and Japanese. Closing an unanswered notice means decline. Practice never requires consent. The notice and button are hidden during practice, including preparation, pause and completion, and are available again after returning to Settings.

This implements **basic Consent Mode**, using conservative opt-in for everyone rather than guessing a visitor's jurisdiction:

- All analytics/ad consent defaults to denied locally before any Google tag initialization.
- No Google script, configuration hit, custom event or cookieless ping is intentionally sent before permission.
- Only `analytics_storage` is granted after Allow; `ad_storage`, `ad_user_data` and `ad_personalization` stay denied.
- Google Signals and ad-personalization signals are disabled; URL passthrough is off and ads data redaction is on.
- The preference is stored independently in `breath-flow-analytics-consent`. Other app preferences are unchanged.
- Withdrawal sets the GA opt-out flag before updating consent, removes only `bf_ga4_` cookies, and blocks subsequent events. Another tab's withdrawal is honored through the storage event. Data already received by Google cannot be withdrawn from the browser.
- Pre-existing browser opt-out flags and blocked storage/tags are respected. There is no retry loop or custom offline event queue.

GA4 still uses **pseudonymous cookie identifiers**, browser/device information and normal network processing after consent; this is not a claim of anonymous or identifier-free tracking. The app does not send names, contact details, messages, medical information, free text, individual phase timings, breath cycles, animation frames or audio events.

Analytics cookies use a dedicated `bf_ga4` prefix, host-only scope, the `/breathwork-app/` path, Secure/SameSite=Lax flags and a configured expiry of up to 90 days, subject to browser restrictions and renewal on activity. Account-side event-data retention is separate. The owner should review the privacy disclosure, controller/contact information, applicable local obligations and GA4 retention/data-processing settings; this implementation does not certify legal compliance. Google's privacy policy is linked from the notice.

## Events and interpretation

All custom events include `language` (`en`, `he`, `ja`), `display_mode` (`browser`, `standalone`), a sanitized virtual `page_location`, a fixed per-view `page_title`, and an empty `page_referrer`. Raw URL queries, arbitrary fragments, external referrers, contact links and WhatsApp messages are never passed to gtag. Virtual page titles distinguish Settings, Library, each Details view, Preparation, Practice and Completion without changing actual navigation.

| Event | Trigger | Additional parameters |
| --- | --- | --- |
| `app_opened` | Once per fresh document, once analytics is permitted and online | None |
| `page_view` | Initial permitted view and meaningful view changes; repeated renders/language changes/pause/resume do not add views | None |
| `practice_selected` | Explicit changed home selection or a library-card selection | `practice_id`, `practice_name` |
| `practice_started` | Preparation ends and the actual breathing clock begins | Practice fields; `duration_seconds` = calculated full-cycle duration |
| `practice_completed` | Natural full-cycle completion, once | Practice fields; `duration_seconds` = full completed duration |
| `practice_stopped` | Manual Stop, Restart or browser Back ends a started practice early | Practice fields; `duration_seconds` = elapsed breathing time, excluding preparation and pauses |
| `contact_clicked` | Contact link activation | None; destination/message never included |
| `pwa_installed` | Supported browser's `appinstalled` signal, once per document | None |

Practice IDs are `coherent`, `box`, `equal`, `extended`, `478` and `custom`. Names are canonical English names across all interface languages. Unknown IDs normalize to Custom rather than transmitting arbitrary strings.

A preparation cancellation produces no practice start/stop. A completion is never followed by a stopped event for the same practice. Pause/resume do not start a new analytics practice. Restart ends the previous started practice and starts a new one only after its new preparation. Reload/closing a tab is not misreported as a manual early stop. No events are sent for interactions before consent or while offline, and a completion/stop is suppressed if its corresponding start was not recorded. Initial opt-in reports the current view only, not a backlog.

Do not sum `duration_seconds` across start, stop and completion events: it has event-specific meaning. Use event filters when comparing planned and completed duration. GA4 reports cover consented, reachable traffic, not every app user. Browser blocking, privacy settings and offline use affect coverage. PWA installation signals are incomplete, especially on iOS; standalone mode is detected separately via display-mode or iOS's navigator flag and does not prove a newly observed installation.

## Offline and updates

Google's script is asynchronous and outside the service-worker precache. The app, all translations, consent controls, audio and images remain available offline through the existing worker. Offline analytics actions are dropped; reconnecting can initialize the permitted tag and report the current view without replaying offline practices. Existing safe worker activation/update handling is unchanged and still waits through active and paused practice.

## Local verification and live GA4 verification

Unit tests cover consent ordering, ID/configuration, deduplication, event boundaries, canonical parameters, opt-out/cookie cleanup, offline dropping and standalone detection. Production Playwright tests mock Google's script and abort collection endpoints; they do not prove receipt by Google. They also test the actual React lifecycle, all consent languages, mobile layouts, blocked loading, offline playback and worker updates.

To verify live traffic:

1. Confirm Enhanced Measurement is OFF in the correct web stream and its Measurement ID is **G-9GMF53JNC3**.
2. Open `https://tomerbreathwork.github.io/breathwork-app/?analytics_debug=1` online. Let any waiting PWA update finish while on Settings. Allow analytics through the shield notice/preferences. The explicit flag enables `debug_mode`; its query is not sent in page locations.
3. In GA4, open **Admin → Data display → DebugView** (or search for DebugView) and select your debug device. Also check **Reports → Realtime**. Account permission, ad blockers, network filtering and processing delays can affect visibility.
4. Expect one `app_opened` and one initial `page_view`. Choose Box, open the library, select a practice, and verify `practice_selected` and distinct virtual page titles. Re-selecting the already active home preset should not add a selection event.
5. Start a one-minute Coherent practice. The three-second preparation sends no `practice_started`; then the event should carry `coherent`, its English canonical name, your selected language and **66** seconds. Pause/resume must not duplicate start/completion. Let it finish and expect exactly one completion. Returning to Settings afterward must not add a stopped event.
6. Start another practice, wait for preparation to finish and stop it early. Expect one `practice_stopped`. Contact should produce only `contact_clicked` with no URL, phone or message parameters. Inspect events in DebugView and, if useful, the browser's Network panel for `g/collect` requests.
7. Withdraw consent with the shield button. New app interactions must not send custom events; reopening Settings must preserve the declined choice. Re-enable only if desired. Close the debug URL and return to the ordinary URL after testing.
8. Use built-in users, sessions and retention reports. For practice breakdowns, create event-scoped custom dimensions for `practice_id`, `practice_name` and `display_mode`, and an event-scoped custom metric for `duration_seconds` (seconds). Use the standard Language dimension where available. Standard reports/custom definitions can take longer to populate than Realtime/DebugView.

Official references for owner review: [Consent Mode](https://developers.google.com/tag-platform/security/guides/consent), [manual page views](https://developers.google.com/analytics/devguides/collection/ga4/views), [Enhanced Measurement](https://support.google.com/analytics/answer/9216061), [Google EU user consent policy](https://www.google.com/about/company/user-consent-policy/). Direct retrieval of these Google pages was blocked by the coding environment; no live account access or Google event receipt is claimed.
