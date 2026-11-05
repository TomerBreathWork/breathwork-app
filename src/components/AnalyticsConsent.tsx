import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { analytics } from "../analytics";
import type { Translator } from "../i18n";

export function AnalyticsConsent({ t, active, onVisibility }: { t: Translator; active: boolean; onVisibility?: (visible: boolean) => void }) {
  const consent = useSyncExternalStore(analytics.subscribe, analytics.getConsent, () => null);
  const [expanded, setExpanded] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const visible = !active && (expanded || consent === null);
  useLayoutEffect(() => { onVisibility?.(visible); }, [visible, onVisibility]);
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
    {(expanded || consent === null) && <aside id="analytics-notice" className="analytics-notice" aria-labelledby="analytics-title" onKeyDown={event => { if (event.key === "Escape") close(); }}>
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
