import { createStore, get, set } from "idb-keyval";

const QUEUE_DB_NAME = "animalmind-offline-actions-queue";
const QUEUE_STORE = "actions";

const queueStore = createStore(QUEUE_DB_NAME, QUEUE_STORE);
const ACTIONS_KEY = "pending-actions";

export type OfflineAction =
  | { type: "add_animal"; payload: any; tempId: string }
  | { type: "update_notes"; payload: { eventId: number; notes: string } }
  | { type: "add_health_record"; payload: any; tempId: string };

export async function getOfflineActions(): Promise<OfflineAction[]> {
  try {
    const actions = await get<OfflineAction[]>(ACTIONS_KEY, queueStore);
    return actions || [];
  } catch (err) {
    console.warn("[OfflineQueueActions] Failed to read queue:", err);
    return [];
  }
}

export async function enqueueOfflineAction(action: OfflineAction): Promise<void> {
  try {
    const current = await getOfflineActions();
    await set(ACTIONS_KEY, [...current, action], queueStore);
    console.log("[OfflineQueueActions] Enqueued action:", action.type);
  } catch (err) {
    console.warn("[OfflineQueueActions] Failed to enqueue action:", err);
  }
}

export async function clearOfflineActions(): Promise<void> {
  try {
    await set(ACTIONS_KEY, [], queueStore);
  } catch (err) {
    console.warn("[OfflineQueueActions] Failed to clear queue:", err);
  }
}

export async function processOfflineActions(mutations: {
  addAnimal: (payload: any) => Promise<any>;
  updateNotes: (payload: any) => Promise<any>;
}) {
  const actions = await getOfflineActions();
  if (actions.length === 0) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;
  const remaining: OfflineAction[] = [];

  for (const action of actions) {
    try {
      if (action.type === "add_animal") {
        await mutations.addAnimal(action.payload);
      } else if (action.type === "update_notes") {
        await mutations.updateNotes(action.payload);
      }
      processed++;
    } catch (err) {
      console.error("[OfflineQueueActions] Failed to process action:", action.type, err);
      remaining.push(action);
      failed++;
    }
  }

  await set(ACTIONS_KEY, remaining, queueStore);
  return { processed, failed };
}
