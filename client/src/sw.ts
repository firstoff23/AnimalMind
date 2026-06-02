/// <reference lib="webworker" />

import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { clientsClaim } from "workbox-core";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import superjson from "superjson";
import {
  getOfflineQueueAuth,
  OFFLINE_QUEUE_SYNC_TAG,
  processPendingQueue,
} from "@/lib/offlineQueue";
import type { AppRouter } from "../../server/routers";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

type SyncEvent = ExtendableEvent & {
  tag: string;
};

type SyncCapableRegistration = ServiceWorkerRegistration & {
  sync?: { register: (tag: string) => Promise<void> };
};

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html")));

async function notifyClients(message: unknown) {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  for (const client of clients) {
    client.postMessage(message);
  }
}

async function processPendingRecordingsFromServiceWorker() {
  const auth = await getOfflineQueueAuth();
  const tokenIsValid = auth?.accessToken && auth.expiresAt > Date.now() + 30_000;

  if (!tokenIsValid) {
    await notifyClients({ type: "process-pending-recordings" });
    return;
  }

  const client = createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${self.location.origin}/api/trpc`,
        transformer: superjson,
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
        },
        fetch(input, init) {
          return globalThis.fetch(input, {
            ...(init ?? {}),
            credentials: "include",
          });
        },
      }),
    ],
  });

  const result = await processPendingQueue((payload) =>
    client.classify.run.mutate(payload)
  );

  await notifyClients({
    type: "offline-queue-changed",
    processed: result.processed,
    failed: result.failed,
  });

  if (result.summary.pendingCount > 0) {
    await (self.registration as SyncCapableRegistration).sync?.register(
      OFFLINE_QUEUE_SYNC_TAG
    );
  }
}

self.addEventListener("sync", (event) => {
  const syncEvent = event as SyncEvent;
  if (syncEvent.tag !== OFFLINE_QUEUE_SYNC_TAG) return;

  syncEvent.waitUntil(processPendingRecordingsFromServiceWorker());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "process-pending-recordings") {
    event.waitUntil(processPendingRecordingsFromServiceWorker());
  }
});

export {};
