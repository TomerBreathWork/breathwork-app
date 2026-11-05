import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { analytics } from '../analytics';
import { installationGuide, installInvitation } from '../install';
import type { Translator } from '../i18n';

export function InstallInvitation({ t, home, privacyOpen }: { t: Translator; home: boolean; privacyOpen: boolean }) {
  const state = useSyncExternalStore(installInvitation.subscribe, installInvitation.snapshot);
  const consent = useSyncExternalStore(analytics.subscribe, analytics.getConsent, () => null);
  const [standalone, setStandalone] = useState(() => window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
  const [instructions, setInstructions] = useState(false), [pending, setPending] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const guide = installationGuide(navigator.userAgent, navigator.maxTouchPoints, navigator.platform);
  useEffect(() => {
    const query = window.matchMedia('(display-mode: standalone)');
    const change = () => setStandalone(query.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    if (query.addEventListener) {
      query.addEventListener('change', change);
      return () => query.removeEventListener('change', change);
    }
    query.addListener?.(change);
    return () => query.removeListener?.(change);
  }, []);
  const visible = home && !privacyOpen && consent !== null && state.eligible && !state.dismissed && !state.installed && !standalone && (state.available || guide !== null || instructions);
  useEffect(() => { if (!home) setInstructions(false); }, [home]);
  useEffect(() => { if (instructions && visible) heading.current?.focus(); }, [instructions, visible]);
  if (!visible) return null;
  function restoreFocus() { document.querySelector<HTMLButtonElement>(".settings-panel .start-button")?.focus(); }
  function dismiss() { installInvitation.dismiss(); restoreFocus(); }
  async function install() {
    if (instructions) { dismiss(); return; }
    if (!state.available) { setInstructions(true); return; }
    setPending(true);
    const handled = await installInvitation.prompt();
    setPending(false);
    if (!handled) setInstructions(true);
    else restoreFocus();
  }
  return <aside className="install-invitation" aria-labelledby="install-title" onKeyDown={event => { if (event.key === 'Escape') dismiss(); }}>
    <h2 id="install-title" ref={heading} tabIndex={-1}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h5a3 3 0 1 1-3 3" /></svg>
      <span>{t('installTitle')}</span>
    </h2>
    <p>{t(instructions ? guide === 'ios' ? 'installSafariGuide' : 'installBrowserGuide' : 'installBody')}</p>
    <div className="install-actions">
      <button type="button" onClick={dismiss}>{t('installLater')}</button>
      <button type="button" className="install-primary" disabled={pending} onClick={() => void install()}>{t(instructions ? 'close' : 'installAdd')}</button>
    </div>
  </aside>;
}
