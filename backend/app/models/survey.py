"""
Survey models for request/response validation
"""

from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime


class SurveySubmitRequest(BaseModel):
    """Survey submission request model"""

    patient_id: str  # Medical record number
    survey_type: str  # e.g., "AUDIT", "PSQI", "BDI"
    responses: Dict[str, Any]  # Survey.js response JSON
    timestamp: str
    token: str  # Patient's auth token


class SurveySubmitResponse(BaseModel):
    """Survey submission response model"""

    message: Optional[str] = None
    survey_id: str  # Unique ID for the survey submission
    score: Optional[float] = None  # Allow None value for score
    interpretation: Optional[str] = None
    summary: Optional[str] = None


class SurveyResult(BaseModel):
    """Individual survey result model"""

    survey_id: str
    patient_id: str
    survey_type: str
    responses: Dict[str, Any]
    timestamp: str
    score: Optional[float] = None
    interpretation: Optional[str] = None
    summary: Optional[str] = None
    subscores: Optional[Dict[str, Any]] = None


class SurveyResultList(BaseModel):
    """List of survey results"""

    surveys: List[SurveyResult]


class SurveyMetadata(BaseModel):
    """Survey metadata model"""

    survey_type: str
    title: str
    description: str
    version: str = "1.0"


class SurveyMetadataList(BaseModel):
    """List of available survey types"""

    surveys: List[SurveyMetadata]


class PatientSurvey(BaseModel):
    """Patient survey metadata for dashboard"""

    survey_type: str
    submission_date: str  # ISO 8601 format
    survey_id: str


class PatientSurveyList(BaseModel):
    """Patient with their surveys"""

    patient_id: str
    surveys: List[PatientSurvey]


class TrendDataPoint(BaseModel):
    """Data point for trend visualization"""

    submission_date: str  # ISO 8601 format
    score: float


class TrendData(BaseModel):
    """Trend data for line graph visualization"""

    patient_id: str
    survey_type: str
    trend_data: List[TrendDataPoint]


class Config:
    from_attributes = True
