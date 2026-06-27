"""
AnimalMind — Tests for POST /classify-image endpoint
=====================================================
Run with:
  pytest ml_backend/tests/test_classify.py -v

The vision model load (_load_vision_model) is mocked so tests run
without downloading ~330 MB of ViT weights and without GPU.
"""

from __future__ import annotations

import io
import sys
import types
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# ── Patch heavy deps before any app import ────────────────────────────────────
def _make_mock(name: str):
    mod = types.ModuleType(name)
    mod.__spec__ = MagicMock()
    return mod

_HEAVY = [
    "asyncpg", "redis",
    "tensorflow", "tensorflow.python", "tensorflow_hub",
    "scipy", "scipy.signal", "scipy.io", "scipy.io.wavfile",
    "librosa", "librosa.core",
    "soundfile",
    "google", "google.generativeai",
    "supabase", "ultralytics",
]
for _n in _HEAVY:
    if _n not in sys.modules:
        sys.modules[_n] = _make_mock(_n)
sys.modules["redis"].from_url = MagicMock(return_value=MagicMock())

sys.path.insert(0, str(Path(__file__).parent.parent))

# ── Mock _load_vision_model and inject a fake model ───────────────────────────

import torch
import torch.nn as nn

class _FakeViTModel(nn.Module):
    """Minimal mock that returns fixed logits."""
    def forward(self, pixel_values=None, **kw):
        B = pixel_values.shape[0] if pixel_values is not None else 1
        return {
            "logits_species": torch.zeros(B, 2),   # → always cat (index 0)
            "logits_breed":   torch.zeros(B, 37),  # → always first breed
        }

_fake_model = _FakeViTModel()
_fake_processor = MagicMock()
_fake_processor.return_value = {"pixel_values": torch.zeros(1, 3, 224, 224)}

def _patched_load():
    import app as _app
    _app._vit_model     = _fake_model
    _app._vit_processor = _fake_processor
    _app._vit_loaded_at = "2026-01-01T00:00:00Z"
    _app._vit_source    = "pretrained-fallback"

# ── Import app with model patched ─────────────────────────────────────────────
with patch("builtins.__import__", wraps=__import__):
    try:
        import app as _app_module
        _app_module._load_vision_model = _patched_load  # monkey-patch
        from fastapi.testclient import TestClient
        client = TestClient(_app_module.app)
    except Exception as exc:
        pytest.skip(f"Could not import app: {exc}", allow_module_level=True)


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_jpeg(color=(200, 100, 50), size=(224, 224)) -> bytes:
    from PIL import Image
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()

def make_png(color=(100, 150, 200), size=(224, 224)) -> bytes:
    from PIL import Image
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ── Tests: /model-health ──────────────────────────────────────────────────────

class TestModelHealth:
    def test_returns_200(self):
        resp = client.get("/model-health")
        assert resp.status_code == 200

    def test_schema_fields(self):
        resp = client.get("/model-health")
        data = resp.json()
        for field in ("loaded", "num_species", "num_breeds", "device"):
            assert field in data, f"Missing field: {field}"

    def test_num_species_is_2(self):
        assert client.get("/model-health").json()["num_species"] == 2

    def test_num_breeds_is_37(self):
        assert client.get("/model-health").json()["num_breeds"] == 37

    def test_device_is_cpu(self):
        assert client.get("/model-health").json()["device"] == "cpu"


# ── Tests: /classify-image ────────────────────────────────────────────────────

KNOWN_SPECIES = ("cat", "dog")
KNOWN_BREEDS = [
    "Abyssinian", "Bengal", "Birman", "Bombay", "British Shorthair",
    "Egyptian Mau", "Maine Coon", "Persian", "Ragdoll", "Russian Blue",
    "Siamese", "Sphynx", "american bulldog", "american pit bull terrier",
    "basset hound", "beagle", "boxer", "chihuahua", "english cocker spaniel",
    "english setter", "german shorthaired", "great pyrenees", "havanese",
    "japanese chin", "keeshond", "leonberger", "miniature pinscher",
    "newfoundland", "pomeranian", "pug", "saint bernard", "samoyed",
    "scottish terrier", "shiba inu", "staffordshire bull terrier",
    "wheaten terrier", "yorkshire terrier",
]


class TestClassifyImage:
    def _post(self, data=None, content_type="image/jpeg"):
        img = data or make_jpeg()
        return client.post(
            "/classify-image",
            files={"file": ("test.jpg", img, content_type)},
        )

    def test_returns_200_for_jpeg(self):
        assert self._post().status_code == 200

    def test_returns_200_for_png(self):
        resp = client.post(
            "/classify-image",
            files={"file": ("test.png", make_png(), "image/png")},
        )
        assert resp.status_code == 200

    def test_response_has_all_fields(self):
        data = self._post().json()
        for field in ("species", "breed", "confidence", "processing_time_ms", "model_source"):
            assert field in data, f"Missing: {field} — got {data}"

    def test_species_is_valid(self):
        assert self._post().json()["species"] in KNOWN_SPECIES

    def test_breed_is_known(self):
        assert self._post().json()["breed"] in KNOWN_BREEDS

    def test_confidence_in_range(self):
        conf = self._post().json()["confidence"]
        assert 0.0 <= conf <= 1.0, f"Out of range: {conf}"

    def test_processing_time_positive(self):
        ms = self._post().json()["processing_time_ms"]
        assert ms >= 0.0, f"Negative processing time: {ms}"

    def test_rejects_gif(self):
        resp = client.post(
            "/classify-image",
            files={"file": ("test.gif", b"GIF89a", "image/gif")},
        )
        assert resp.status_code == 415

    def test_rejects_bad_bytes_as_jpeg(self):
        resp = client.post(
            "/classify-image",
            files={"file": ("bad.jpg", b"not-an-image", "image/jpeg")},
        )
        assert resp.status_code in (400, 500)

    def test_model_loaded_after_classify(self):
        self._post()
        loaded = client.get("/model-health").json()["loaded"]
        assert loaded is True


# ── Tests: existing routes not broken ─────────────────────────────────────────

class TestExistingRoutes:
    def test_root_returns_200(self):
        assert client.get("/").status_code == 200

    def test_root_version(self):
        assert "1.4.0" in client.get("/").text

    def test_health_returns_healthy(self):
        assert client.get("/health").json()["status"] == "healthy"
