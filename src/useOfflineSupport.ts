import { useEffect, useLayoutEffect, useState } from "react";
import type { Settings } from "./settings";
import type { NavigationSnapshot } from "./navigation";
import { offlineManager, type OfflineStatus } from "./offline";

export function useOfflineSupport(practicing: boolean, settings: Settings, snapshot?: () => NavigationSnapshot | undefined) {
  const [status, setStatus] = useState<OfflineStatus>("offlineSaving");
  useLayoutEffect(() => {
    offlineManager.setConfiguration(settings);
    offlineManager.setNavigationSnapshot(snapshot);
  }, [settings, snapshot]);
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
