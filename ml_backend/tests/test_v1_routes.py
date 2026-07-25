"""
Tests for new ML Backend v1 endpoints (/v1/classify-breed, /v1/feedback, /ready)
"""
import sys
import types
from pathlib import Path
from unittest.mock import MagicMock

# Add ml_backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Test imports
from schemas.breed import BreedClassificationResponse
from schemas.feedback import FeedbackRequest, FeedbackResponse
from services.quality import assess_image_quality
from services.breed_knowledge import get_breed_info


def test_quality_assessment_pass():
    # Generate mock bright image bytes
    from PIL import Image
    import io

    img = Image.new("RGB", (200, 200), color=(128, 128, 128))
    # Draw noise to ensure Laplacian variance
    import random
    pixels = img.load()
    for x in range(200):
        for y in range(200):
            pixels[x, y] = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))

    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    image_bytes = buf.getvalue()

    is_acc, var, msg = assess_image_quality(image_bytes, threshold=10.0)
    assert is_acc is True
    assert var >= 10.0


def test_breed_knowledge_lookup():
    info = get_breed_info("Labrador Retriever", species="dog")
    assert info is not None
    assert info.species == "dog"
    assert "Amigável" in info.temperament

    cat_info = get_breed_info("Persian", species="cat")
    assert cat_info is not None
    assert cat_info.species == "cat"


def test_schemas_validation():
    req = FeedbackRequest(
        model_name="animalmind-breed-classifier",
        model_version="v1.0.0",
        input_hash="hash123",
        prediction="Labrador Retriever",
        confidence=0.95,
        is_correct=True,
    )
    assert req.prediction == "Labrador Retriever"
    assert req.confidence == 0.95
