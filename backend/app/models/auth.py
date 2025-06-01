"""
Authentication models for request/response validation
"""

from pydantic import BaseModel
from typing import Literal


class LoginRequest(BaseModel):
    """Login request model"""

    user_id: str  # Medical record number for patients, email for clinicians
    password: str  # Birthdate initially for patients, admin-set for clinicians
    user_type: Literal["patient", "clinician"]


class LoginResponse(BaseModel):
    """Login response model"""

    token: str
    user_id: str
    user_type: Literal["patient", "clinician"]


class UpdatePasswordRequest(BaseModel):
    """Password update request model"""

    user_id: str  # Medical record number
    current_password: str
    new_password: str


class UpdatePasswordResponse(BaseModel):
    """Password update response model"""

    message: str


class RegisterClinicianRequest(BaseModel):
    """Clinician registration request model"""

    admin_token: str  # Admin authentication token
    clinician_email: str  # Clinician's email (used as ID)
    password: str


class RegisterClinicianResponse(BaseModel):
    """Clinician registration response model"""

    message: str
    clinician_id: str


class TokenData(BaseModel):
    """Token data model for JWT validation"""

    user_id: str
    user_type: str
