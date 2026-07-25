import hashlib
import json
import time
from typing import Any, Dict, Optional


# In-memory LRU fallback dictionary
_memory_cache: Dict[str, Dict[str, Any]] = {}
VISION_CACHE_TTL = 86400  # 24 hours in seconds


def get_image_hash(image_bytes: bytes) -> str:
    """Computes SHA-256 hash of image content."""
    return hashlib.sha256(image_bytes).hexdigest()


def get_cached_inference(cache_key: str, redis_conn=None) -> Optional[Dict[str, Any]]:
    """Retrieves cached inference result from Redis or in-memory dict."""
    if redis_conn:
        try:
            cached = redis_conn.get(cache_key)
            if cached:
                print(f"[Cache] Redis hit for {cache_key}")
                return json.loads(cached)
        except Exception as e:
            print(f"[Cache] Redis read error: {e}")

    # Fallback to in-memory cache
    if cache_key in _memory_cache:
        entry = _memory_cache[cache_key]
        if time.time() < entry["expires_at"]:
            print(f"[Cache] In-Memory hit for {cache_key}")
            return entry["data"]
        else:
            del _memory_cache[cache_key]

    return None


def set_cached_inference(cache_key: str, data: Dict[str, Any], redis_conn=None, ttl: int = VISION_CACHE_TTL):
    """Saves inference result into Redis or in-memory dict."""
    if redis_conn:
        try:
            redis_conn.setex(cache_key, ttl, json.dumps(data))
            return
        except Exception as e:
            print(f"[Cache] Redis write error: {e}")

    # Fallback in-memory dict (cap max entries to 500)
    if len(_memory_cache) > 500:
        # Evict oldest entry
        oldest_key = min(_memory_cache, key=lambda k: _memory_cache[k]["created_at"])
        del _memory_cache[oldest_key]

    _memory_cache[cache_key] = {
        "data": data,
        "created_at": time.time(),
        "expires_at": time.time() + ttl,
    }
