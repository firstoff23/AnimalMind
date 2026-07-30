from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class FeedbackRequest(BaseModel):
    model_name: str = Field(..., example="animalmind-breed-classifier")
    model_version: str = Field(default="v1.0.0", example="v1.0.0")
    input_hash: str = Field(..., example="sha256...")
    prediction: str = Field(..., example="Labrador Retriever")
    confidence: float = Field(..., ge=0.0, le=1.0, example=0.92)
    is_correct: bool = Field(..., example=False)
    correct_label: Optional[str] = Field(default=None, example="Golden Retriever")
    user_confidence: Optional[int] = Field(default=None, ge=1, le=5, example=4)
    feedback_text: Optional[str] = Field(default=None, example="O cão é dourado, não preto!")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, example={"device": "iPhone"})
    image_path: Optional[str] = Field(default=None, example="feedback_images/abc123.jpg")


class FeedbackResponse(BaseModel):
    status: str = "success"
    id: str
    image_path: Optional[str] = None
