"""
Unit Tests for /v1/classify-audio Endpoint
===========================================
"""

import io
import pytest
import numpy as np
import scipy.io.wavfile as wavfile
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)


def generate_mock_wav_bytes(duration_sec: float = 1.0, sampling_rate: int = 16000) -> bytes:
    """Generates a valid 16kHz mono WAV audio file byte stream for testing."""
    num_samples = int(duration_sec * sampling_rate)
    t = np.linspace(0, duration_sec, num_samples, endpoint=False)
    # Generate 440 Hz sine wave audio tone
    audio_data = (np.sin(2 * np.pi * 440 * t) * 32767).astype(np.int16)
    
    buf = io.BytesIO()
    wavfile.write(buf, sampling_rate, audio_data)
    return buf.getvalue()


def test_classify_audio_valid_wav():
    wav_bytes = generate_mock_wav_bytes()
    response = client.post(
        "/v1/classify-audio",
        files={"file": ("test_bark.wav", wav_bytes, "audio/wav")}
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert "vocalization_class" in data
    assert "confidence" in data
    assert "top3" in data
    assert "calibrated" in data
    assert isinstance(data["calibrated"], bool)
    assert len(data["top3"]) == 3
    assert data["processing_time_ms"] > 0


def test_classify_audio_empty_file():
    response = client.post(
        "/v1/classify-audio",
        files={"file": ("empty.wav", b"", "audio/wav")}
    )
    assert response.status_code == 400
    assert "vazio" in response.json()["detail"].lower()


def test_classify_audio_invalid_mime():
    response = client.post(
        "/v1/classify-audio",
        files={"file": ("document.pdf", b"%PDF-1.4 mock content", "application/pdf")}
    )
    assert response.status_code == 400
    assert "inválido" in response.json()["detail"].lower() or "invalid" in response.json()["detail"].lower()


if __name__ == "__main__":
    test_classify_audio_valid_wav()
    test_classify_audio_empty_file()
    test_classify_audio_invalid_mime()
    print("ALL AUDIO ROUTE TESTS PASSED SUCCESSFULLY!")
