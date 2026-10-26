import { useEffect, useLayoutEffect, useState } from "react";
import type { Settings } from "./settings";
import { offlineManager, type OfflineStatus } from "./offline";

export function useOfflineSupport(practicing: boolean, settings: Settings) {
  const [status, setStatus] = useState<OfflineStatus>("offlineSaving");
  useLayoutEffect(() => {
    offlineManager.setConfiguration(settings);
  }, [settings]);
  useEffect(() => {
    const unsubscribe = offlineManager.subscribe(setStatus);
    offlineManager.start();
    return unsubscribe;
  }, []);
  useEffect(() => {
    offlineManager.setBusy(practicing);
  }, [practicing]);
  return {
    offlineStatus: status,
    beginPractice: () => offlineManager.setBusy(true),
  };
}
