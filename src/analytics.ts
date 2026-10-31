/** GA4 basic consent mode: no Google request or event before opt-in.
 * Only the event/parameter allowlist below reaches gtag. Never pass URLs, form
 * values, contact messages, user IDs, phase timings or arbitrary objects here.
 */
export const GA_MEASUREMENT_ID = "G-9GMF53JNC3";
export const ANALYTICS_CONSENT_KEY = "breath-flow-analytics-consent";
export type AnalyticsConsent = "granted" | "denied" | null;
type Language = "en" | "he" | "ja";
export type AnalyticsView = "settings" | "library" | "preparation" | "practice" | "completed" | `details/${string}`;
const publicUrl = "https://tomerbreathwork.github.io/breathwork-app/";
const names = {
  coherent: "Coherent Breathing", box: "Box Breathing", equal: "1:1 Breathing",
  extended: "Extended Exhale (1:2)", "478": "4-7-8 Breathing", custom: "Custom Breathing",
} as const;
type PracticeId = keyof typeof names;
type EventName = "app_opened" | "page_view" | "practice_selected" | "practice_started" | "practice_completed" | "practice_stopped" | "contact_clicked" | "pwa_installed";
const deniedConsent = { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" };
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}
const practiceId = (id: string): PracticeId => Object.hasOwn(names, id) ? id as PracticeId : "custom";
const safeLanguage = (language: string): Language => language === "he" || language === "ja" ? language : "en";
const safeView = (view: AnalyticsView): string =>
  view.startsWith("details/") ? `details/${practiceId(view.slice(8))}` :
    ["settings", "library", "preparation", "practice", "completed"].includes(view) ? view : "settings";
const viewTitle = (view: string) => `Breath Flow — ${view.startsWith("details/")
  ? names[practiceId(view.slice(8))]
  : ({ settings: "Settings", library: "Practice Library", preparation: "Preparation", practice: "Practice", completed: "Practice Complete" } as Record<string, string>)[view]}`;

export class AnalyticsClient {
  private consent: AnalyticsConsent;
  private listeners = new Set<() => void>();
  private enabled = false;
  private listening = false;
  private installed = false;
  private bridge = false;
  private configured = false;
  private scriptRequested = false;
  private opened = false;
  private sentView = "";
  private view = "settings";
  private language: Language = "en";
  private browser: Window | undefined;
  private externalOptOut = false;
  constructor(browser: Window | undefined = typeof window === "undefined" ? undefined : window) {
    this.browser = browser;
    try { this.externalOptOut = (browser as unknown as Record<string, unknown>)?.[`ga-disable-${GA_MEASUREMENT_ID}`] === true; }
    catch { this.externalOptOut = true; }
    this.consent = this.readConsent();
  }
  getConsent = (): AnalyticsConsent => this.consent;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private readConsent(): AnalyticsConsent {
    try {
      const value = this.browser?.localStorage.getItem(ANALYTICS_CONSENT_KEY);
      return value === "granted" || value === "denied" ? value : null;
    } catch { return null; }
  }
  private online() { try { return this.browser?.navigator.onLine !== false; } catch { return false; } }
  private displayMode() {
    const standalone = (this.browser?.navigator as Navigator & { standalone?: boolean })?.standalone;
    try {
      return this.browser?.matchMedia?.("(display-mode: standalone)").matches || standalone ? "standalone" : "browser";
    } catch { return standalone ? "standalone" : "browser"; }
  }
  private command(...args: unknown[]) {
    try {
      if (!this.browser?.gtag) return false;
      this.browser.gtag(...args); return true;
    } catch { return false; /* Blocked analytics cannot affect practice. */ }
  }
  private disable(disabled: boolean) {
    if (!this.browser || (this.externalOptOut && !disabled)) return false;
    try {
      const values = this.browser as unknown as Record<string, unknown>, key = `ga-disable-${GA_MEASUREMENT_ID}`;
      if (values[key] !== disabled) values[key] = disabled;
      return values[key] === disabled;
    } catch { return false; }
  }
  private installBridge() {
    if (this.bridge) return true;
    if (!this.browser) return false;
    const browser = this.browser;
    try {
      browser.dataLayer ??= [];
      browser.gtag ??= function () { browser.dataLayer!.push(arguments); };
    } catch { return false; }
    this.bridge = true;
    this.command("consent", "default", deniedConsent);
    this.command("set", "ads_data_redaction", true);
    this.command("set", "url_passthrough", false);
    return true;
  }
  open(view: AnalyticsView, language: string, enabled: boolean) {
    this.enabled = enabled;
    this.view = safeView(view); this.language = safeLanguage(language);
    if (!this.browser || !enabled) return;
    if (!this.installBridge()) return;
    if (!this.listening) {
      this.listening = true;
      this.browser.addEventListener("appinstalled", () => {
        if (this.installed) return;
        this.installed = true; this.send("pwa_installed");
      });
      this.browser.addEventListener("online", () => this.flushOpening());
      this.browser.addEventListener("storage", event => {
        if (event.key === ANALYTICS_CONSENT_KEY) this.applyConsent(this.readConsent());
      });
    }
    this.disable(this.consent !== "granted");
    this.flushOpening();
  }
  setConsent = (consent: Exclude<AnalyticsConsent, null>) => {
    try { this.browser?.localStorage.setItem(ANALYTICS_CONSENT_KEY, consent); } catch { /* Keep the choice in memory if storage is unavailable. */ }
    this.applyConsent(consent);
  };
  private applyConsent(consent: AnalyticsConsent) {
    const changed = this.consent !== consent;
    this.consent = consent;
    this.disable(consent !== "granted");
    if (this.bridge) this.command("consent", "update", { ...deniedConsent, analytics_storage: consent === "granted" ? "granted" : "denied" });
    if (consent !== "granted") this.removeCookies();
    else this.flushOpening();
    if (changed) this.listeners.forEach(listener => listener());
  }
  private removeCookies() {
    try {
      const document = this.browser?.document;
      for (const cookie of document?.cookie.split(";") ?? []) {
        const name = cookie.split("=")[0].trim();
        if (!name.startsWith("bf_ga4_")) continue;
        for (const path of ["/breathwork-app/", "/"])
          document!.cookie = `${name}=; Max-Age=0; Path=${path}; SameSite=Lax`;
      }
    } catch { /* Restricted cookies must never break the application. */ }
  }
  private ensureTag() {
    if (!this.enabled || !this.browser || this.consent !== "granted" || !this.online()) return false;
    if (!this.installBridge() || !this.disable(false)) return false;
    if (!this.configured) {
      this.configured = true;
      this.command("consent", "update", { ...deniedConsent, analytics_storage: "granted" });
      this.command("js", new Date());
      // Explicit virtual page views only. Enhanced Measurement must also be OFF
      // in the GA4 web stream, especially its automatic outbound-link tracking.
      this.command("set", { page_location: publicUrl, page_referrer: "", page_title: "Breath Flow" });
      let debug = false;
      try { debug = new URL(this.browser.location.href).searchParams.get("analytics_debug") === "1"; } catch {}
      this.command("config", GA_MEASUREMENT_ID, {
        send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
        ignore_referrer: true, page_location: publicUrl, page_referrer: "", page_title: "Breath Flow",
        cookie_domain: "none", cookie_path: "/breathwork-app/", cookie_prefix: "bf_ga4",
        cookie_expires: 90 * 24 * 60 * 60, cookie_flags: "SameSite=Lax;Secure",
        ...(debug ? { debug_mode: true } : {}),
      });
    }
    if (!this.scriptRequested) {
      this.scriptRequested = true;
      try {
        const script = this.browser.document.createElement("script");
        script.async = true; script.id = "breath-flow-ga4";
        script.referrerPolicy = "no-referrer";
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
        script.onerror = () => { /* No retry loop, offline queue or application error. */ };
        this.browser.document.head.appendChild(script);
      } catch { /* Ad blockers and unavailable DOMs cannot prevent practice. */ }
    }
    return true;
  }
  private send(event: EventName, practice?: string, seconds?: number, language: string = this.language) {
    if (!this.ensureTag()) return false;
    const id = practice === undefined ? undefined : practiceId(practice);
    const params: Record<string, string | number> = {
      language: safeLanguage(language), display_mode: this.displayMode(),
      page_location: `${publicUrl}#${this.view}`, page_referrer: "", page_title: viewTitle(this.view),
      ...(id === undefined ? {} : { practice_id: id, practice_name: names[id] }),
      ...(seconds === undefined || !Number.isFinite(seconds) ? {} : { duration_seconds: Math.max(0, Math.round(seconds * 10) / 10) }),
    };
    return this.command("event", event, params);
  }
  private flushOpening() {
    if (!this.ensureTag()) return;
    if (!this.opened) { this.opened = true; this.send("app_opened"); }
    if (this.sentView !== this.view) {
      this.sentView = this.view;
      this.command("set", { page_location: `${publicUrl}#${this.view}`, page_referrer: "", page_title: viewTitle(this.view) });
      this.send("page_view");
    }
  }
  selectPractice(id: string, language: string) { this.send("practice_selected", id, undefined, language); }
  contactClicked() { this.send("contact_clicked"); }
  createPractice(id: string, language: string, durationSeconds: number) {
    let started = false, terminal = false, emitted = false;
    return {
      start: () => {
        if (started || terminal) return;
        started = true; emitted = this.send("practice_started", id, durationSeconds, language);
      },
      complete: () => {
        if (terminal) return;
        terminal = true;
        if (started && emitted) this.send("practice_completed", id, durationSeconds, language);
      },
      stop: (elapsedSeconds: number) => {
        if (terminal) return;
        terminal = true;
        if (started && emitted) this.send(elapsedSeconds >= durationSeconds ? "practice_completed" : "practice_stopped", id, Math.min(elapsedSeconds, durationSeconds), language);
      },
    };
  }
}
export const analytics = new AnalyticsClient();
export type PracticeAnalytics = ReturnType<AnalyticsClient["createPractice"]>;
