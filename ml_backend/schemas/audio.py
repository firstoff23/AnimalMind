from typing import List, Optional
from pydantic import BaseModel, Field


class TopAudioPrediction(BaseModel):
    vocalization: str = Field(..., example="bark", description="Vocalization class name")
    confidence: float = Field(..., example=0.942, description="Calibrated confidence score (0.0 to 1.0)")


class AudioClassificationResponse(BaseModel):
    vocalization_class: str = Field(..., example="bark", description="Top predicted vocalization class")
    confidence: float = Field(..., example=0.942, description="Calibrated confidence score for top prediction")
    top3: List[TopAudioPrediction] = Field(..., description="Top 3 vocalization predictions")
    calibrated: bool = Field(True, description="Indicates if Temperature Scaling calibration was applied")
    processing_time_ms: float = Field(..., example=45.2, description="Processing time in milliseconds")
