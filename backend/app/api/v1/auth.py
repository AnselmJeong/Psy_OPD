"""
Authentication endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from app.models.auth import (
    LoginRequest,
    LoginResponse,
    UpdatePasswordRequest,
    UpdatePasswordResponse,
    RegisterClinicianRequest,
    RegisterClinicianResponse,
)
from app.services.firebase import firebase_service
from app.dependencies.auth import verify_admin_token

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Authenticate a user (patient or clinician) and return a session token
    """
    try:
        # Verify credentials
        is_valid = await firebase_service.verify_password(
            request.user_id, request.password
        )

        if not is_valid:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Get user profile to verify user type
        user_profile = await firebase_service.get_user_profile(request.user_id)

        if not user_profile:
            raise HTTPException(status_code=401, detail="User profile not found")

        # Verify user type matches
        if user_profile.get("user_type") != request.user_type:
            raise HTTPException(status_code=401, detail="Invalid user type")

        # For simplicity, we'll create a custom token
        # In a real implementation, use Firebase Auth custom tokens
        try:
            # Create Firebase custom token
            from firebase_admin import auth

            custom_token = auth.create_custom_token(
                request.user_id, {"user_type": request.user_type}
            )
            token = custom_token.decode("utf-8")
        except Exception:
            # Fallback to simple token for development
            import jwt
            from app.config.settings import settings

            payload = {"uid": request.user_id, "user_type": request.user_type}
            token = jwt.encode(
                payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM
            )

        return LoginResponse(
            token=token, user_id=request.user_id, user_type=request.user_type
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


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
