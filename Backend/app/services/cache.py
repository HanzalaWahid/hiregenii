"""Simple in-process cache (single process only)."""

from __future__ import annotations

from typing import Any, Dict, Optional

api_cache: Dict[str, Any] = {}


def get_cached_result(key: str) -> Optional[Any]:
    return api_cache.get(key)


def set_cached_result(key: str, value: Any):
    # Limit cache size to prevent memory leaks in this demo
    if len(api_cache) > 1000:
        api_cache.clear()
    api_cache[key] = value
