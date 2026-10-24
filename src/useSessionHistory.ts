import { useEffect, useRef } from "react";
export function useSessionHistory(active: boolean, onExit: () => void) {
  const inside = useRef(false),
    exit = useRef(onExit),
    marker = useRef(`breath-flow-${Date.now()}`);
  exit.current = onExit;
  useEffect(() => {
    const pop = () => {
      inside.current = false;
      exit.current();
      if (history.state?.breathFlow === marker.current)
        history.replaceState(null, "", location.href);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    if (active && !inside.current) {
      history.pushState({ breathFlow: marker.current }, "", location.href);
      inside.current = true;
    } else if (!active && inside.current) {
      inside.current = false;
      if (history.state?.breathFlow === marker.current) history.back();
    }
  }, [active]);
}
