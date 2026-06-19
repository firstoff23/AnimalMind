"""
conftest.py — Mock heavy backend dependencies for testing classify endpoints.
All heavy deps (librosa, tensorflow, redis, asyncpg, supabase) are mocked
BEFORE app is imported, so tests only exercise the vision classifier path.
"""
import sys
import types
from unittest.mock import MagicMock, patch
import pytest


def _make_mock(name: str):
    mod = types.ModuleType(name)
    mod.__spec__ = MagicMock()   # prevents ".__spec__ is not set" errors
    return mod


# Mock every heavy dep before app.py is imported
_HEAVY = [
    "asyncpg", "redis",
    "tensorflow", "tensorflow.python", "tensorflow.python.framework",
    "tensorflow_hub",
    "scipy", "scipy.signal", "scipy.io", "scipy.io.wavfile",
    "librosa", "librosa.core", "librosa.feature",
    "soundfile",
    "google", "google.generativeai",
    "supabase",
    "ultralytics",
    "csv",
]
for _name in _HEAVY:
    if _name not in sys.modules:
        sys.modules[_name] = _make_mock(_name)

# Also patch redis.from_url used at module level
sys.modules["redis"].from_url = MagicMock(return_value=MagicMock())
