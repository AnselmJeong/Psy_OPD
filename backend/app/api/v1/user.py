"""
User management endpoints
"""

from fastapi import APIRouter, HTTPException, Depends

from app.models.user import (
    UserProfile,
    UpdateUserProfileRequest,
    UpdateUserProfileResponse,
)
from app.models.auth import TokenData
from app.services.firebase import firebase_service
from app.dependencies.auth import get_current_user, verify_patient_access

router = APIRouter()


@router.get("/{user_id}", response_model=UserProfile)
async def get_user_profile(
    user_id: str, current_user: TokenData = Depends(get_current_user)
):
    """
    Retrieve user profile data

    Patients can only access their own data
    Clinicians can access any patient's data
    """
    try:
        # Verify access permissions
        verify_patient_access(user_id, current_user)

        # Get user profile from Firebase
        profile_data = await firebase_service.get_user_profile(user_id)

        if not profile_data:
            raise HTTPException(status_code=404, detail="User profile not found")

        # Convert to response model
        user_profile = UserProfile(
            user_id=profile_data["user_id"],
            user_type=profile_data["user_type"],
            demographic_info=profile_data.get("demographic_info"),
            psychiatric_history=profile_data.get("psychiatric_history"),
        )

        return user_profile

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get user profile: {str(e)}"
        )


@router.put("/{user_id}", response_model=UpdateUserProfileResponse)
async def update_user_profile(
    user_id: str,
    request: UpdateUserProfileRequest,
    current_user: TokenData = Depends(get_current_user),
):
    """
    Update user profile data

    Patients can only update their own data
    Clinicians can update any patient's data
    """
    try:
        # Verify access permissions
        verify_patient_access(user_id, current_user)

        # Prepare update data
        update_data = {}

        if request.demographic_info is not None:
            update_data["demographic_info"] = request.demographic_info.dict(
                exclude_none=True
            )

        if request.psychiatric_history is not None:
            update_data["psychiatric_history"] = request.psychiatric_history.dict(
                exclude_none=True
            )

        if not update_data:
            raise HTTPException(status_code=400, detail="No data provided for update")

        # Update profile in Firebase
        success = await firebase_service.update_user_profile(user_id, update_data)

        if not success:
            raise HTTPException(status_code=400, detail="Failed to update profile")

        return UpdateUserProfileResponse(message="User profile updated successfully")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to update user profile: {str(e)}"
        )


@router.delete("/{user_id}")
async def delete_user_profile(
    user_id: str, current_user: TokenData = Depends(get_current_user)
):
    """
    Delete user profile (admin only or self-deletion for patients)
    """
    try:
        # Only allow self-deletion for patients or any deletion for clinicians
        if current_user.user_type == "patient" and current_user.user_id != user_id:
            raise HTTPException(
                status_code=403, detail="Patients can only delete their own profile"
            )

        # Get user profile to check if it exists
        profile = await firebase_service.get_user_profile(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="User profile not found")

        # Delete from Firebase (you would implement this method)
        # For now, we'll just mark as deleted
        update_data = {"deleted": True, "deleted_by": current_user.user_id}

        await firebase_service.update_user_profile(user_id, update_data)

        return {"message": "User profile deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete user profile: {str(e)}"
        )


@router.get("/{user_id}/surveys-summary")
async def get_user_surveys_summary(
    user_id: str, current_user: TokenData = Depends(get_current_user)
):
    """
    Get a summary of user's surveys
    """
    try:
        # Verify access permissions
        verify_patient_access(user_id, current_user)

        # Get user's surveys
        surveys = await firebase_service.get_patient_surveys(user_id)

        if not surveys:
            return {
                "user_id": user_id,
                "total_surveys": 0,
                "survey_types": [],
                "latest_survey": None,
                "summary": "No surveys completed yet",
            }

        # Calculate summary statistics
        survey_types = list(set(s["survey_type"] for s in surveys))
        latest_survey = max(surveys, key=lambda x: x["submission_date"])

        # Group by survey type for latest scores
        latest_scores = {}
        for survey in surveys:
            survey_type = survey["survey_type"]
            if (
                survey_type not in latest_scores
                or survey["submission_date"]
                > latest_scores[survey_type]["submission_date"]
            ):
                latest_scores[survey_type] = {
                    "score": survey["score"],
                    "submission_date": survey["submission_date"],
                }

        summary = {
            "user_id": user_id,
            "total_surveys": len(surveys),
            "survey_types": survey_types,
            "latest_survey": {
                "survey_type": latest_survey["survey_type"],
                "submission_date": latest_survey["submission_date"],
                "score": latest_survey["score"],
            },
            "latest_scores_by_type": latest_scores,
            "summary": f"Completed {len(surveys)} surveys across {len(survey_types)} different types",
        }

        return summary

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get surveys summary: {str(e)}"
        )


@router.post("/{user_id}/demographic-info")
async def update_demographic_info(
    user_id: str,
    demographic_info: dict,
    current_user: TokenData = Depends(get_current_user),
):
    """
    Update only demographic information
    """
    try:
        # Verify access permissions
        verify_patient_access(user_id, current_user)

        # Update demographic info
        update_data = {"demographic_info": demographic_info}
        success = await firebase_service.update_user_profile(user_id, update_data)

        if not success:
            raise HTTPException(
                status_code=400, detail="Failed to update demographic information"
            )

        return {"message": "Demographic information updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to update demographic info: {str(e)}"
        )


@router.post("/{user_id}/psychiatric-history")
async def update_psychiatric_history(
    user_id: str,
    psychiatric_history: dict,
    current_user: TokenData = Depends(get_current_user),
):
    """
    Update only psychiatric history information
    """
    try:
        # Verify access permissions
        verify_patient_access(user_id, current_user)

        # Update psychiatric history
        update_data = {"psychiatric_history": psychiatric_history}
        success = await firebase_service.update_user_profile(user_id, update_data)

        if not success:
            raise HTTPException(
                status_code=400, detail="Failed to update psychiatric history"
            )

        return {"message": "Psychiatric history updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to update psychiatric history: {str(e)}"
        )
