/** Installation eligibility is independent of analytics and survives later visits. */
export const INSTALL_ELIGIBLE_KEY = 'breath-flow-install-eligible';
export const INSTALL_DISMISSED_KEY = 'breath-flow-install-dismissed';
interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
function saved(key: string) { try { return localStorage.getItem(key) === '1'; } catch { return false; } }
function save(key: string) { try { localStorage.setItem(key, '1'); } catch { /* Restricted storage: retain this document's choice. */ } }
let state = { eligible: saved(INSTALL_ELIGIBLE_KEY), dismissed: saved(INSTALL_DISMISSED_KEY), installed: false, available: false };
let deferred: InstallEvent | undefined;
const listeners = new Set<() => void>();
function publish(patch: Partial<typeof state>) { state = { ...state, ...patch }; listeners.forEach(listener => listener()); }
export const installInvitation = {
  subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  snapshot: () => state,
  practiceStarted() { if (!state.eligible) { save(INSTALL_ELIGIBLE_KEY); publish({ eligible: true }); } },
  dismiss() { save(INSTALL_DISMISSED_KEY); publish({ dismissed: true }); },
  async prompt() {
    const event = deferred;
    if (!event) return false;
    deferred = undefined;
    publish({ available: false });
    try {
      await event.prompt();
      await event.userChoice;
      // Neither accepted nor dismissed proves installation. Only appinstalled does.
      installInvitation.dismiss();
      return true;
    } catch { return false; }
  },
};
export function installationGuide(userAgent: string, touchPoints = 0, platform = ''): 'ios' | 'browser' | null {
  if (/Instagram|FBAN|FBAV|WhatsApp|Line\//i.test(userAgent)) return 'browser';
  if (/iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && touchPoints > 1))
    return /CriOS|FxiOS|EdgiOS/.test(userAgent) ? 'browser' : 'ios';
  return null;
}
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferred = event as InstallEvent;
    publish({ available: true });
  });
  window.addEventListener('appinstalled', () => {
    deferred = undefined;
    save(INSTALL_DISMISSED_KEY);
    publish({ installed: true, dismissed: true, available: false });
  });
  window.addEventListener('storage', event => {
    if (event.key === INSTALL_ELIGIBLE_KEY || event.key === INSTALL_DISMISSED_KEY)
      publish({ eligible: saved(INSTALL_ELIGIBLE_KEY), dismissed: saved(INSTALL_DISMISSED_KEY) });
  });
}
