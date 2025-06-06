"""
Authentication dependencies for token validation and role-based access
"""

from typing import Optional
from fastapi import Depends, HTTPException, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from app.config.settings import settings

from app.services.firebase import firebase_service
from app.models.auth import TokenData

# HTTP Bearer token scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> TokenData:
    """
    Get current user from JWT token

    Args:
        credentials: HTTP authorization credentials

    Returns:
        TokenData: User data from token

    Raises:
        HTTPException: If token is invalid
    """
    token = credentials.credentials

    try:
        # Decode JWT token
        decoded_token = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )

        # Extract user data
        user_id = decoded_token.get("uid")
        user_type = decoded_token.get("user_type", "patient")  # Default to patient

        if not user_id:
            raise HTTPException(
                status_code=401, detail="Invalid token: missing user ID"
            )

        return TokenData(user_id=user_id, user_type=user_type)

    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(
            status_code=401, detail=f"Token validation failed: {str(e)}"
        )


async def get_current_patient(
    current_user: TokenData = Depends(get_current_user),
) -> TokenData:
    """
    Ensure current user is a patient

    Args:
        current_user: Current user data

    Returns:
        TokenData: Patient user data

    Raises:
        HTTPException: If user is not a patient
    """
    if current_user.user_type != "patient":
        raise HTTPException(status_code=403, detail="Patient access required")

    return current_user


async def get_current_clinician(
    current_user: TokenData = Depends(get_current_user),
) -> TokenData:
    """
    Ensure current user is a clinician

    Args:
        current_user: Current user data

    Returns:
        TokenData: Clinician user data

    Raises:
        HTTPException: If user is not a clinician
    """
    if current_user.user_type != "clinician":
        raise HTTPException(status_code=403, detail="Clinician access required")

    return current_user


async def get_patient_or_clinician(
    current_user: TokenData = Depends(get_current_user),
) -> TokenData:
    """
    Allow both patients and clinicians

    Args:
        current_user: Current user data

    Returns:
        TokenData: User data
    """
    return current_user


def verify_patient_access(patient_id: str, current_user: TokenData) -> bool:
    """
    Verify that a user can access patient data

    Args:
        patient_id: ID of the patient whose data is being accessed
        current_user: Current user making the request

    Returns:
        bool: True if access is allowed

    Raises:
        HTTPException: If access is denied
    """
    # Clinicians can access any patient's data
    if current_user.user_type == "clinician":
        return True

    # Patients can only access their own data
    if current_user.user_type == "patient" and current_user.user_id == patient_id:
        return True

    raise HTTPException(
        status_code=403, detail="Access denied: insufficient permissions"
    )


async def verify_admin_token(admin_token: str) -> bool:
    """
    Verify admin token for administrative operations

    Args:
        admin_token: Admin token from request

    Returns:
        bool: True if token is valid

    Raises:
        HTTPException: If token is invalid
    """
    if not settings.ADMIN_SECRET_KEY:
        raise HTTPException(
            status_code=500, detail="Admin functionality not configured"
        )

    if admin_token != settings.ADMIN_SECRET_KEY:
        raise HTTPException(status_code=401, detail="Invalid admin token")

    return True


# Optional token for endpoints that can work with or without authentication
async def get_optional_user(
    authorization: Optional[str] = Header(None),
) -> Optional[TokenData]:
    """
    Get current user if token is provided, otherwise return None

    Args:
        authorization: Optional authorization header

    Returns:
        Optional[TokenData]: User data if authenticated, None otherwise
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.replace("Bearer ", "")

    try:
        decoded_token = await firebase_service.verify_token(token)
        user_id = decoded_token.get("uid")
        user_type = decoded_token.get("user_type", "patient")

        if user_id:
            return TokenData(user_id=user_id, user_type=user_type)

    except Exception:
        # Invalid token, but we return None instead of raising an exception
        pass

    return None
