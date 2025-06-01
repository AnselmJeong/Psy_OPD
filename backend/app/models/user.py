"""
User models for request/response validation
"""

from pydantic import BaseModel
from typing import Dict, Any, Optional, Literal
from datetime import datetime


class DemographicInfo(BaseModel):
    """Demographic information model"""

    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None  # ISO format date
    contact_phone: Optional[str] = None
    emergency_contact: Optional[str] = None


class PsychiatricHistory(BaseModel):
    """Psychiatric history information model"""

    previous_diagnoses: Optional[str] = None
    current_medications: Optional[str] = None
    allergies: Optional[str] = None
    family_history: Optional[str] = None
    substance_use_history: Optional[str] = None
    previous_hospitalizations: Optional[str] = None


class UserProfile(BaseModel):
    """Complete user profile model"""

    user_id: str
    user_type: Literal["patient", "clinician"]
    demographic_info: Optional[DemographicInfo] = None
    psychiatric_history: Optional[PsychiatricHistory] = None


class UpdateUserProfileRequest(BaseModel):
    """User profile update request model"""

    demographic_info: Optional[DemographicInfo] = None
    psychiatric_history: Optional[PsychiatricHistory] = None


class UpdateUserProfileResponse(BaseModel):
    """User profile update response model"""

    message: str


class ClinicianProfile(BaseModel):
    """Clinician-specific profile model"""

    user_id: str
    email: str
    specialization: Optional[str] = None
    license_number: Optional[str] = None
    department: Optional[str] = None
