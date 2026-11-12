import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { analytics } from "../analytics";
import type { Translator } from "../i18n";

export function AnalyticsConsent({ t, active, onVisibility }: { t: Translator; active: boolean; onVisibility?: (visible: boolean) => void }) {
  const consent = useSyncExternalStore(analytics.subscribe, analytics.getConsent, () => null);
  const [expanded, setExpanded] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const notice = useRef<HTMLElement>(null);
  const visible = !active && (expanded || consent === null);
  useLayoutEffect(() => { onVisibility?.(visible); }, [visible, onVisibility]);
  useLayoutEffect(() => {
    if (!visible) return;
    const node = notice.current!, page = node.closest<HTMLElement>(".app-page")!;
    // Keep this nonmodal notice: the form stays operable and focus is never trapped.
    const revealFocus = () => {
      const focused = document.activeElement;
      if (!(focused instanceof HTMLElement) || !page.contains(focused) ||
          node.contains(focused) || focused === button.current ||
          focused.closest("dialog") || !focused.matches("input, button, select, textarea, a[href]")) return;
      if (focused.closest(".language-picker")) {
        page.scrollTo({ top: 0, behavior: "instant" });
        return;
      }
      const field = focused.getBoundingClientRect();
      const top = Math.max(page.getBoundingClientRect().top, button.current!.getBoundingClientRect().bottom) + 8;
      const bottom = node.getBoundingClientRect().top - 8;
      const distance = field.bottom > bottom ? field.bottom - bottom : field.top < top ? field.top - top : 0;
      if (distance) page.scrollBy({ top: distance, behavior: "instant" });
    };
    const measure = () => {
      const rect = node.getBoundingClientRect();
      page.style.setProperty("--analytics-clearance", `${Math.ceil(page.getBoundingClientRect().bottom - rect.top + 8)}px`);
      revealFocus();
    };
    page.setAttribute("data-analytics-notice", "open");
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    page.addEventListener("focusin", revealFocus);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      page.removeEventListener("focusin", revealFocus);
      window.removeEventListener("resize", measure);
      page.removeAttribute("data-analytics-notice");
      page.style.removeProperty("--analytics-clearance");
    };
  }, [visible]);
  if (active) return null;
  const close = () => {
    if (consent === null) analytics.setConsent("denied");
    setExpanded(false);
    button.current?.focus();
  };
  return <>
    <button ref={button} className="analytics-preferences" type="button" aria-label={t("analyticsPreferences")} title={t("analyticsPreferences")} aria-expanded={expanded || consent === null} aria-controls="analytics-notice" onClick={() => setExpanded(true)}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 3 4.5 6v5c0 4.5 3 7.8 7.5 10 4.5-2.2 7.5-5.5 7.5-10V6Z" /><path d="m8.5 12 2.4 2.4 4.8-5" /></svg>
    </button>
    {(expanded || consent === null) && <aside ref={notice} id="analytics-notice" className="analytics-notice" aria-labelledby="analytics-title" onKeyDown={event => { if (event.key === "Escape") close(); }}>
      <button type="button" className="analytics-close" aria-label={t("close")} onClick={close}>×</button>
      <h2 id="analytics-title">{t("analyticsTitle")}</h2>
      <div className="analytics-copy">{t("analyticsBody").split("\n\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      {expanded && <p className="analytics-choice">{t(consent === "granted" ? "analyticsEnabled" : "analyticsDisabled")}</p>}
      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">{t("analyticsGooglePrivacy")}</a>
      <div className="analytics-actions">
        <button className="analytics-secondary" type="button" onClick={() => { analytics.setConsent("denied"); setExpanded(false); button.current?.focus(); }}>{t("analyticsDecline")}</button>
        <button className="analytics-primary" type="button" onClick={() => { analytics.setConsent("granted"); setExpanded(false); button.current?.focus(); }}>{t("analyticsAllow")}</button>
      </div>
      <p className="analytics-footer">{t("analyticsFooter")}</p>
    </aside>}
  </>;
}
