"""
Authentication endpoints
"""

from fastapi import APIRouter, HTTPException, Depends, status
from app.models.auth import (
    LoginRequest,
    LoginResponse,
    UpdatePasswordRequest,
    UpdatePasswordResponse,
    RegisterClinicianRequest,
    RegisterClinicianResponse,
    TokenData,
    # RegisterRequest,  # Commented out due to ImportError
    # RegisterResponse,  # Commented out due to ImportError
    # RefreshTokenRequest,  # Commented out due to ImportError
    # RefreshTokenResponse,  # Commented out due to ImportError
)
from app.services.firebase import firebase_service

# from app.services.auth import auth_service  # Commented out due to ImportError
from app.dependencies.auth import verify_admin_token
from pydantic import BaseModel
from google.cloud import firestore
import requests
from app.config.settings import settings

router = APIRouter()


# Patient Login Model
class PatientLoginRequest(BaseModel):
    medicalRecordNumber: str
    password: str


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Authenticate a user (patient or clinician) and return a session token
    """
    try:
        # Use Firebase Auth REST API for email/password verification
        FIREBASE_API_KEY = settings.FIREBASE_API_KEY  # Add this to your settings
        url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
        payload = {
            "email": request.user_id,
            "password": request.password,
            "returnSecureToken": True,
        }
        resp = requests.post(url, json=payload)
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        id_token = resp.json()["idToken"]
        return LoginResponse(
            token=id_token, user_id=request.user_id, user_type=request.user_type
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Login failed: {str(e)}")


@router.post("/patient/update-password", response_model=UpdatePasswordResponse)
async def update_patient_password(request: UpdatePasswordRequest):
    """
    Allow patients to update their password
    """
    try:
        # Verify current password
        is_valid = await firebase_service.verify_password(
            request.user_id, request.current_password
        )

        if not is_valid:
            raise HTTPException(status_code=401, detail="Invalid current password")

        # Update password
        success = await firebase_service.update_password(
            request.user_id, request.new_password
        )

        if not success:
            raise HTTPException(status_code=400, detail="Failed to update password")

        # Also update in user profile for our simplified auth
        await firebase_service.update_user_profile(
            request.user_id, {"password": request.new_password}
        )

        return UpdatePasswordResponse(message="Password updated successfully")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Password update failed: {str(e)}")


@router.post("/clinician/register", response_model=RegisterClinicianResponse)
async def register_clinician(request: RegisterClinicianRequest):
    """
    Allow administrators to register a new clinician
    """
    try:
        # Verify admin token
        await verify_admin_token(request.admin_token)

        # Check if clinician already exists
        existing_profile = await firebase_service.get_user_profile(
            request.clinician_email
        )
        if existing_profile:
            raise HTTPException(
                status_code=409, detail="Clinician email already exists"
            )

        # Create user in Firebase Auth
        user_id = await firebase_service.create_user(
            user_id=request.clinician_email,
            password=request.password,
            email=request.clinician_email,
        )

        # Create user profile
        user_data = {
            "user_id": request.clinician_email,
            "email": request.clinician_email,
            "user_type": "clinician",
            "password": request.password,  # Store for simplified auth
        }

        await firebase_service.create_user_profile(request.clinician_email, user_data)

        return RegisterClinicianResponse(
            message="Clinician registered successfully",
            clinician_id=request.clinician_email,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@router.post("/patient/register")
async def register_patient(user_id: str, password: str, admin_token: str):
    """
    Allow administrators to register a new patient (simplified endpoint)
    """
    try:
        # Verify admin token
        await verify_admin_token(admin_token)

        # Check if patient already exists
        existing_profile = await firebase_service.get_user_profile(user_id)
        if existing_profile:
            raise HTTPException(status_code=409, detail="Patient ID already exists")

        # Create user profile
        user_data = {
            "user_id": user_id,
            "user_type": "patient",
            "password": password,  # Store for simplified auth
        }

        await firebase_service.create_user_profile(user_id, user_data)

        return {"message": "Patient registered successfully", "patient_id": user_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@router.post("/patient/login")
async def patient_login(request: PatientLoginRequest):
    """
    Handle patient login by validating and storing credentials in Firebase Firestore.
    For initial login, password is the date of birth.
    """
    from app.services.firebase import firebase_service

    try:
        # Check if patient exists in Firestore
        db = firebase_service.db
        patient_ref = db.collection("patients").document(request.medicalRecordNumber)
        patient_doc = patient_ref.get()
        if patient_doc.exists:
            stored_data = patient_doc.to_dict()
            if stored_data.get("password") == request.password:
                # Create a token for the patient
                import jwt
                from app.config.settings import settings

                payload = {"uid": request.medicalRecordNumber, "user_type": "patient"}
                token = jwt.encode(
                    payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM
                )
                return {"success": True, "message": "Login successful", "token": token}
            else:
                return {"success": False, "message": "Invalid password"}
        else:
            # New patient, store credentials
            patient_ref.set(
                {
                    "medicalRecordNumber": request.medicalRecordNumber,
                    "password": request.password,
                    "createdAt": firestore.SERVER_TIMESTAMP,
                }
            )
            # Create a token for the new patient
            import jwt
            from app.config.settings import settings

            payload = {"uid": request.medicalRecordNumber, "user_type": "patient"}
            token = jwt.encode(
                payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM
            )
            return {
                "success": True,
                "message": "New patient registered and logged in",
                "token": token,
            }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during patient login: {str(e)}",
        )
