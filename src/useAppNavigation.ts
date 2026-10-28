import { useEffect, useState } from "react";
import { screenFromHistory, type Screen } from "./navigation";
export function useAppNavigation(active: boolean) {
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  useEffect(() => {
    history.replaceState(
      { breathFlowView: { name: "home" } },
      "",
      location.href,
    );
    const pop = () => setScreen(screenFromHistory(history.state));
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    document.querySelector(".app-page")?.scrollTo(0, 0);
    document
      .querySelector<HTMLElement>(
        active ? ".session-panel" : ".discovery-panel h2, .settings-panel",
      )
      ?.focus({ preventScroll: true });
  }, [screen, active]);
  function open(view: Screen) {
    history.pushState({ breathFlowView: view }, "", location.href);
    setScreen(view);
  }
  return { screen, open, back: () => history.back() };
}
