import { createStore, get, set } from "idb-keyval";

const CACHE_DB_NAME = "animalmind-offline-cache";
const CACHE_STORE = "data-cache";

const cacheStore = createStore(CACHE_DB_NAME, CACHE_STORE);

// Keys for cached data
export const CACHE_KEYS = {
  ANIMALS_LIST: "animals-list",
  ACTIVE_ANIMAL: "active-animal",
  EVENTS_HISTORY: "events-history",
  FOODS_CACHE_PREFIX: "foods-search-",
};

export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const cached = await get<T>(key, cacheStore);
    return cached !== undefined ? cached : null;
  } catch (err) {
    console.warn(`[OfflineCache] Failed to get cache for key ${key}:`, err);
    return null;
  }
}

export async function setCachedData<T>(key: string, data: T): Promise<void> {
  try {
    await set(key, data, cacheStore);
  } catch (err) {
    console.warn(`[OfflineCache] Failed to set cache for key ${key}:`, err);
  }
}

export async function getCachedFoods(query: string, species: string) {
  const cacheKey = `${CACHE_KEYS.FOODS_CACHE_PREFIX}${species}-${query.toLowerCase().trim()}`;
  return getCachedData<any[]>(cacheKey);
}

export async function setCachedFoods(
  query: string,
  species: string,
  foods: any[],
) {
  const cacheKey = `${CACHE_KEYS.FOODS_CACHE_PREFIX}${species}-${query.toLowerCase().trim()}`;
  await setCachedData(cacheKey, foods);
}
