import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { NavigationController } from "./navigation-controller";
import { launchNavigation, type Settings } from "./settings";
import { restoreSavedConfiguration } from "./launch-configuration";
import { getPractice } from "./practices";
import type { NavigationDraft, SetupScreen } from "./navigation";

export function useAppNavigation(
  session: { status: "idle" | "running" | "paused" | "completed"; pause: () => void; stop: () => void },
  settings: Settings,
  setSettings: React.Dispatch<React.SetStateAction<Settings>>,
  restoreProfile?: (view: SetupScreen, draft?: NavigationDraft) => boolean,
) {
  const latest = useRef({ session, setSettings, restoreProfile });
  latest.current = { session, setSettings, restoreProfile };
  const [controller] = useState(() => new NavigationController(window, {
    pause: () => latest.current.session.pause(),
    stop: () => latest.current.session.stop(),
    restore: (view: SetupScreen, draft?: NavigationDraft) => {
      if (latest.current.restoreProfile?.(view,draft)) return;
      if (view.name !== "details" && !(view.name === "home" && view.mode === "selected")) return;
      latest.current.setSettings(value => {
        const restored = draft && restoreSavedConfiguration(draft);
        if (restored?.rhythm) return { ...value, ...restored };
        if (view.name !== "details" || value.practiceId === view.id) return value;
        const practice = getPractice(view.id)!;
        return { ...value, practiceId: practice.id, preset: practice.preset, rhythm: [...practice.rhythm], minutes: 3 };
      });
    },
  }, launchNavigation));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  useLayoutEffect(() => { controller.start(); return controller.dispose; }, [controller]);
  useLayoutEffect(() => { controller.updateSession(session.status); }, [controller, session.status]);
  useLayoutEffect(() => { controller.remember(settings); }, [controller, settings]);
  const previous = useRef(state.screen);
  const active = session.status !== "idle";
  useEffect(() => {
    const homeToggle = previous.current.name === "home" && state.screen.name === "home";
    const filterChange = previous.current.name === "library" && state.screen.name === "library";
    previous.current = state.screen;
    // SettingsPanel owns focus for its chooser/selected transition.
    if ((homeToggle || filterChange) && !active) return;
    document.querySelector(".app-page")?.scrollTo(0, 0);
    document.querySelector<HTMLElement>(active ? ".session-panel" : ".discovery-panel h2, .settings-panel")?.focus({ preventScroll: true });
  }, [state.screen, active]);
  return { ...state, open: controller.open, back: controller.back, chooseHome: controller.chooseHome,
    filterLibrary: controller.filterLibrary, beginSession: controller.beginSession, endSession: controller.end, stay: controller.stay,
    snapshotForUpdate: controller.snapshotForUpdate };
}
