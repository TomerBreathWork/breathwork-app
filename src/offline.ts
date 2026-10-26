import { preserveConfigurationForUpdate, type Settings } from "./settings";

export type OfflineStatus =
  | "offlineSaving"
  | "offlineReady"
  | "offlineUnavailable";

/** One manager per document, shared across React StrictMode subscriptions.
 * Never reload during preparation, running OR paused practice. Also ask every
 * other tab before activating a waiting worker; do not use autoUpdate/skipWaiting.
 */
class OfflineManager {
  private busy = true;
  private reloadPending = false;
  private configuration?: Settings;
  private registration?: ServiceWorkerRegistration;
  private registering = false;
  private watched = new WeakSet<ServiceWorkerRegistration>();
  private watchedWorkers = new WeakSet<ServiceWorker>();
  private started = false;
  private status: OfflineStatus = "offlineSaving";
  private listeners = new Set<(status: OfflineStatus) => void>();

  subscribe(listener: (status: OfflineStatus) => void) {
    this.listeners.add(listener);
    listener(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private publish(status: OfflineStatus) {
    this.status = status;
    this.listeners.forEach((listener) => listener(status));
  }
  private reloadIfIdle = () => {
    if (this.reloadPending && !this.busy) {
      if (this.configuration)
        preserveConfigurationForUpdate(this.configuration);
      location.reload();
    }
  };
  setConfiguration(settings: Settings) {
    this.configuration = settings;
  }
  setBusy(busy: boolean) {
    this.busy = busy;
    if (!busy) {
      if (this.reloadPending) this.reloadIfIdle();
      else this.tryActivation();
    }
  }
  private tryActivation = () => {
    if (!this.busy)
      this.registration?.waiting?.postMessage({
        type: "BREATH_FLOW_ACTIVATE_IF_IDLE",
      });
  };
  private checkReady = () => {
    const worker = this.registration?.active;
    if (!worker) return;
    const channel = new MessageChannel();
    const timeout = setTimeout(() => {
      channel.port1.close();
      this.publish("offlineUnavailable");
    }, 5000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timeout);
      channel.port1.close();
      this.publish(event.data?.ready ? "offlineReady" : "offlineUnavailable");
    };
    worker.postMessage({ type: "BREATH_FLOW_OFFLINE_STATUS" }, [channel.port2]);
  };
  private update = () => {
    if (document.visibilityState !== "visible") return;
    if (
      !this.registration ||
      (!this.registration.active &&
        !this.registration.installing &&
        !this.registration.waiting)
    ) {
      void this.register();
      return;
    }
    this.checkReady();
    this.tryActivation();
    if (navigator.onLine) void this.registration?.update().catch(() => {});
  };
  start() {
    if (this.started) return;
    this.started = true;
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) {
      this.publish("offlineUnavailable");
      return;
    }
    let hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "BREATH_FLOW_CAN_UPDATE")
        event.ports[0]?.postMessage({ idle: !this.busy });
    });
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hadController) {
        this.reloadPending = true;
        this.reloadIfIdle();
      } else {
        hadController = true;
        this.checkReady();
      }
    });
    window.addEventListener("online", this.update);
    document.addEventListener("visibilitychange", this.update);
    // Stop returns through the existing history entry. A concurrent back()
    // traversal can cancel reload(), so retry after that traversal settles.
    window.addEventListener("popstate", this.reloadIfIdle);
    // Check deployments and tabs that closed while blocking an update. A failed
    // first install also retries without requiring a reload or losing settings.
    window.setInterval(this.update, 60_000);
    void this.register();
  }
  private async register() {
    if (this.registering) return;
    this.registering = true;
    try {
      const registration = await navigator.serviceWorker.register(
        `${import.meta.env.BASE_URL}service-worker.js`,
        {
          scope: import.meta.env.BASE_URL,
          updateViaCache: "none",
        },
      );
      this.registration = registration;
      const watch = () => {
        const worker = registration.installing;
        if (!worker || this.watchedWorkers.has(worker)) return;
        this.watchedWorkers.add(worker);
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed") this.tryActivation();
          if (worker.state === "activated") this.checkReady();
          if (worker.state === "redundant" && !registration.active)
            this.publish("offlineUnavailable");
        });
      };
      if (!this.watched.has(registration)) {
        registration.addEventListener("updatefound", watch);
        this.watched.add(registration);
      }
      watch();
      this.checkReady();
      this.tryActivation();
    } catch {
      this.publish("offlineUnavailable");
    } finally {
      this.registering = false;
    }
  }
}
export const offlineManager = new OfflineManager();
