"""
Authentication dependencies for token validation and role-based access
"""

from typing import Optional
from fastapi import Depends, HTTPException, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth as firebase_auth
from app.config.settings import settings
import jwt

from app.services.firebase import firebase_service
from app.models.auth import TokenData

# HTTP Bearer token scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> TokenData:
    """
    Get current user from JWT token (supports both Firebase tokens and custom JWT tokens)

    Args:
        credentials: HTTP authorization credentials

    Returns:
        TokenData: User data from token

    Raises:
        HTTPException: If token is invalid
    """
    token = credentials.credentials

    # First try Firebase token verification
    try:
        decoded_token = firebase_auth.verify_id_token(token)
        user_id = decoded_token.get("email") or decoded_token.get("uid")
        user_type = "clinician" if user_id and not user_id.isdigit() else "patient"
        print(
            f"[DEBUG] Firebase token verified: user_id={user_id}, user_type={user_type}"
        )
        return TokenData(user_id=user_id, user_type=user_type)
    except Exception as firebase_error:
        print(f"[DEBUG] Firebase token verification failed: {firebase_error}")

        # If Firebase fails, try custom JWT verification for patients
        try:
            decoded_payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
            )
            user_id = decoded_payload.get("uid")
            user_type = decoded_payload.get("user_type", "patient")
            print(
                f"[DEBUG] Custom JWT token verified: user_id={user_id}, user_type={user_type}"
            )
            return TokenData(user_id=user_id, user_type=user_type)
        except Exception as jwt_error:
            print(f"[DEBUG] Custom JWT token verification failed: {jwt_error}")
            raise HTTPException(
                status_code=401,
                detail=f"Invalid token: Firebase error - {str(firebase_error)}, JWT error - {str(jwt_error)}",
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
    print(f"[DEBUG] verify_patient_access - patient_id: {patient_id}")
    print(
        f"[DEBUG] verify_patient_access - current_user.user_id: {current_user.user_id}"
    )
    print(
        f"[DEBUG] verify_patient_access - current_user.user_type: {current_user.user_type}"
    )

    # Clinicians can access any patient's data
    if current_user.user_type == "clinician":
        print(f"[DEBUG] Access granted: user is clinician")
        return True

    # Patients can only access their own data
    if current_user.user_type == "patient" and current_user.user_id == patient_id:
        print(f"[DEBUG] Access granted: patient accessing own data")
        return True

    print(f"[DEBUG] Access denied: insufficient permissions")
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
