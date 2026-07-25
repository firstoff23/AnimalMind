from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class Top3Item(BaseModel):
    breed: str
    confidence: float


class BreedInfo(BaseModel):
    species: str
    group: Optional[str] = None
    temperament: Optional[List[str]] = None
    description: Optional[str] = None
    exercise_needs: Optional[str] = None
    health_risks: Optional[List[str]] = None
    life_expectancy: Optional[str] = None
    average_weight: Optional[str] = None


class BreedClassificationResponse(BaseModel):
    breed: str
    confidence: float
    species: str = "dog"
    top3: List[Top3Item]
    info: Optional[BreedInfo] = None
    processing_time_ms: float = 0.0
