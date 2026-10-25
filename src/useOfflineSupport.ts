import { useEffect, useState } from "react";
import { offlineManager, type OfflineStatus } from "./offline";

export function useOfflineSupport(practicing: boolean) {
  const [status, setStatus] = useState<OfflineStatus>("offlineSaving");
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
