/// <reference lib="webworker" />
import { setCacheNameDetails } from "workbox-core";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  matchPrecache,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

setCacheNameDetails({ prefix: "breath-flow-breathwork-app" });
// Installation fails atomically if any required download fails. Never report
// offline readiness for a partial install. Revisions cover mutable public media.
const entries = self.__WB_MANIFEST;
precacheAndRoute(entries);
cleanupOutdatedCaches();
const scopePath = new URL(self.registration.scope).pathname;
const escapedScope = scopePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
registerRoute(
  new NavigationRoute(createHandlerBoundToURL("index.html"), {
    allowlist: [new RegExp(`^${escapedScope}(?:index\\.html)?(?:\\?.*)?$`)],
  }),
);

async function allAssetsCached() {
  return (
    await Promise.all(
      entries.map((entry) =>
        matchPrecache(typeof entry === "string" ? entry : entry.url),
      ),
    )
  ).every(Boolean);
}

async function clientIsIdle(client: WindowClient): Promise<boolean> {
  // Every live tab must explicitly consent. A paused/background practice, an
  // older client without this protocol, or a suspended tab blocks activation.
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => {
      channel.port1.close();
      resolve(false);
    }, 1500);
    channel.port1.onmessage = (event) => {
      clearTimeout(timeout);
      channel.port1.close();
      resolve(event.data?.idle === true);
    };
    client.postMessage({ type: "BREATH_FLOW_CAN_UPDATE" }, [channel.port2]);
  });
}

let activating: Promise<void> | undefined;
async function activateWhenIdle() {
  const clients = (
    await self.clients.matchAll({ type: "window", includeUncontrolled: true })
  ).filter((client) => client.url.startsWith(self.registration.scope));
  if ((await Promise.all(clients.map(clientIsIdle))).every(Boolean))
    await self.skipWaiting();
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "BREATH_FLOW_OFFLINE_STATUS") {
    event.waitUntil(
      allAssetsCached().then((ready) => event.ports[0]?.postMessage({ ready })),
    );
  }
  if (event.data?.type === "BREATH_FLOW_ACTIVATE_IF_IDLE") {
    activating ??= activateWhenIdle().finally(() => {
      activating = undefined;
    });
    event.waitUntil(activating);
  }
});
self.addEventListener("activate", (event) => {
  // Installation has finished. The page independently postpones any reload if
  // a session began during the handshake. Other GitHub Pages apps are untouched.
  event.waitUntil(self.clients.claim());
});
