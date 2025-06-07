"""
Survey endpoints
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query

from app.models.survey import (
    SurveySubmitRequest,
    SurveySubmitResponse,
    SurveyResult,
    SurveyResultList,
    SurveyMetadata,
    SurveyMetadataList,
)
from app.models.auth import TokenData
from app.services.firebase import firebase_service
from app.services.scoring import get_score_interpretation
from app.dependencies.auth import get_current_user, verify_patient_access
from app.config.settings import settings

router = APIRouter()

# Survey type mapping from frontend to backend
SURVEY_TYPE_MAPPING = {
    "demographic": "DEMOGRAPHIC",
    "past-history": "PAST_HISTORY",
    "audit": "AUDIT",
    "psqi": "PSQI",
    "bdi": "BDI",
    "bai": "BAI",
    "k-mdq": "K-MDQ",
}


async def verify_mock_token(token: str, patient_id: str) -> dict:
    """Verify mock token for development"""
    if token.startswith("mock_token_") and token.endswith(patient_id):
        return {"uid": patient_id, "user_type": "patient"}
    raise HTTPException(status_code=401, detail="Invalid mock token")


@router.post("/submit", response_model=SurveySubmitResponse)
async def submit_survey(request: SurveySubmitRequest):
    """
    Process and store a patient's survey response
    """
    try:
        # Verify token from request body (for compatibility with frontend)
        if request.token.startswith("mock_token_"):
            # Use mock token verification for development
            decoded_token = await verify_mock_token(request.token, request.patient_id)
        else:
            # Use Firebase token verification for production
            decoded_token = await firebase_service.verify_token(request.token)

        # Verify the token belongs to the patient submitting the survey
        if decoded_token.get("uid") != request.patient_id:
            raise HTTPException(
                status_code=401, detail="Token does not match patient ID"
            )

        # Map survey type from frontend format to backend format
        backend_survey_type = SURVEY_TYPE_MAPPING.get(
            request.survey_type.lower(), request.survey_type.upper()
        )

        # Get patient's demographic info for gender (if needed for scoring)
        gender = None
        try:
            print(
                f"[DEBUG] Fetching demographic info for patient_id: {request.patient_id}"
            )
            demographic_info = await firebase_service.get_patient_demographic_info(
                request.patient_id
            )

            if demographic_info:
                print(f"[DEBUG] Demographic info keys: {list(demographic_info.keys())}")
                # Look for gender field in various possible formats
                gender = (
                    demographic_info.get("gender")
                    or demographic_info.get("성별")
                    or demographic_info.get("sex")
                )
                print(f"[DEBUG] Extracted gender: '{gender}'")
            else:
                print("[DEBUG] No demographic info found")

        except Exception as e:
            print(f"[DEBUG] Error fetching demographic info: {e}")
            # If demographic info is not available, continue without gender
            pass

        print(f"[DEBUG] Final gender value: '{gender}'")

        # Score the survey using new scoring system - skip for demographic surveys
        if backend_survey_type.lower() not in ["demographic", "past_history"]:
            score_result = get_score_interpretation(
                rating_result=request.responses,
                scale_name=backend_survey_type,
                gender=gender,
                generate_llm_report=True,
            )

            # Check for scoring errors
            if "error" in score_result:
                # If the tool is not supported, still save the survey but without scoring
                score_result = {
                    "total_score": None,
                    "subscores": None,
                    "interpretation": "Scoring not available for this survey type",
                    "llm_report": "Survey data has been recorded, but scoring is not available for this survey type.",
                }
        else:
            # For demographic and past history, just store without scoring
            score_result = {
                "total_score": None,
                "subscores": None,
                "interpretation": "Demographic/History information recorded",
                "llm_report": "Demographic and medical history information has been successfully recorded.",
            }

        # Prepare survey data for storage
        survey_data = {
            "patient_id": request.patient_id,
            "survey_type": backend_survey_type,
            "responses": request.responses,
            "score": score_result.get("total_score"),
            "subscores": score_result.get("subscores"),
            "interpretation": score_result.get("interpretation"),
            "summary": score_result.get("llm_report"),
        }

        # Save to Firebase
        survey_id = await firebase_service.save_survey_result(survey_data)

        return SurveySubmitResponse(
            survey_id=survey_id,
            score=score_result.get("total_score"),
            summary=score_result.get("llm_report"),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Survey submission failed: {str(e)}"
        )


@router.get("/patient/{patient_id}", response_model=List[SurveyResult])
async def get_patient_surveys(
    patient_id: str,
    survey_type: Optional[str] = Query(None, description="Filter by survey type"),
    date: Optional[str] = Query(None, description="Filter by submission date"),
    current_user: TokenData = Depends(get_current_user),
):
    """
    Retrieve a patient's survey results and summaries
    """
    try:
        # Debug logging
        print(f"[DEBUG] Getting surveys for patient_id: {patient_id}")
        print(
            f"[DEBUG] Current user: {current_user.user_id}, type: {current_user.user_type}"
        )
        print(f"[DEBUG] Survey type filter: {survey_type}")

        # Verify access permissions
        verify_patient_access(patient_id, current_user)

        # Map survey type from frontend format to backend format if provided
        mapped_survey_type = None
        if survey_type:
            mapped_survey_type = SURVEY_TYPE_MAPPING.get(
                survey_type.lower(), survey_type.upper()
            )
            print(f"[DEBUG] Mapped survey type: {survey_type} -> {mapped_survey_type}")

        # Get surveys from Firebase
        surveys = await firebase_service.get_patient_surveys(
            patient_id, mapped_survey_type, date
        )

        # Convert to response model
        results = []
        for survey in surveys:
            result = SurveyResult(
                survey_id=survey["survey_id"],
                patient_id=patient_id,
                survey_type=survey["survey_type"],
                timestamp=survey["submission_date"],
                submission_date=survey["submission_date"],  # Frontend compatibility
                score=survey.get("score"),  # Use .get() to handle missing scores
                summary=survey.get("summary", ""),  # Use .get() with default
                responses=survey.get("responses", {}),  # Use .get() with default
                subscores=survey.get("subscores"),
                interpretation=survey.get("interpretation"),
            )
            results.append(result)

        return results

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve surveys: {str(e)}"
        )


@router.get("/metadata", response_model=SurveyMetadataList)
async def get_survey_metadata():
    """
    Get list of available survey types and their configurations
    """
    try:
        # Define available surveys
        surveys = [
            SurveyMetadata(
                survey_type="AUDIT",
                title="Alcohol Use Disorders Identification Test - Korean",
                description="Assessment for alcohol-related problems and risks",
            ),
            SurveyMetadata(
                survey_type="PSQI",
                title="Pittsburgh Sleep Quality Index",
                description="Assessment of sleep quality and disturbances",
            ),
            SurveyMetadata(
                survey_type="BDI",
                title="Beck Depression Inventory",
                description="Assessment for symptoms of depression",
            ),
            SurveyMetadata(
                survey_type="BAI",
                title="Beck Anxiety Inventory",
                description="Assessment for symptoms of anxiety",
            ),
            SurveyMetadata(
                survey_type="K-MDQ",
                title="Korean Mood Disorder Questionnaire",
                description="Screening tool for bipolar disorder",
            ),
        ]

        return SurveyMetadataList(surveys=surveys)

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get survey metadata: {str(e)}"
        )


@router.get("/patient/{patient_id}/summary")
async def get_patient_summary(
    patient_id: str, current_user: TokenData = Depends(get_current_user)
):
    """
    Get a comprehensive summary of a patient's survey results
    """
    try:
        # Verify access permissions
        verify_patient_access(patient_id, current_user)

        # Get all surveys for the patient
        surveys = await firebase_service.get_patient_surveys(patient_id)

        if not surveys:
            raise HTTPException(status_code=404, detail="No surveys found for patient")

        # Group by survey type and get latest results
        latest_surveys = {}
        for survey in surveys:
            survey_type = survey["survey_type"]
            if (
                survey_type not in latest_surveys
                or survey["submission_date"]
                > latest_surveys[survey_type]["submission_date"]
            ):
                latest_surveys[survey_type] = survey

        # Create comprehensive summary
        summary = {
            "patient_id": patient_id,
            "total_surveys": len(surveys),
            "survey_types_completed": list(latest_surveys.keys()),
            "latest_results": {},
        }

        for survey_type, survey_data in latest_surveys.items():
            summary["latest_results"][survey_type] = {
                "score": survey_data["score"],
                "submission_date": survey_data["submission_date"],
                "summary": survey_data["summary"],
                "interpretation": survey_data.get("interpretation"),
            }

        return summary

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get patient summary: {str(e)}"
        )


@router.delete("/patient/{patient_id}/survey/{survey_id}")
async def delete_survey(
    patient_id: str, survey_id: str, current_user: TokenData = Depends(get_current_user)
):
    """
    Delete a specific survey (admin or patient own data only)
    """
    try:
        # Verify access permissions
        verify_patient_access(patient_id, current_user)

        # Get survey to verify it belongs to the patient
        survey_doc = firebase_service.db.collection("surveys").document(survey_id).get()

        if not survey_doc.exists:
            raise HTTPException(status_code=404, detail="Survey not found")

        survey_data = survey_doc.to_dict()
        if survey_data.get("patient_id") != patient_id:
            raise HTTPException(
                status_code=403, detail="Survey does not belong to patient"
            )

        # Delete the survey
        firebase_service.db.collection("surveys").document(survey_id).delete()

        return {"message": "Survey deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete survey: {str(e)}"
        )


@router.get("/test-llm")
async def test_llm_connection():
    """
    Test LLM connection and API key configuration
    """
    try:
        from app.services.llm import generate_report
        from app.config.settings import settings

        # Check if API key is configured
        if not settings.GOOGLE_API_KEY:
            return {
                "status": "error",
                "message": "GOOGLE_API_KEY not configured",
                "api_key_present": False,
                "fallback_mode": True,
            }

        # Test with simple data
        test_rating_result = {"test-01": 1, "test-02": 2, "test-03": 0}

        test_score_interpretation = {
            "total_score": 3,
            "interpretation": "Test interpretation for LLM connectivity",
            "tool_name": "TEST",
        }

        # Try to generate a report
        report = generate_report(
            rating_result=test_rating_result,
            scale_name="TEST",
            score_interpretation=test_score_interpretation,
        )

        # Check if it's a fallback report or actual LLM response
        is_fallback = "자동 생성된 기본 보고서" in report

        return {
            "status": "success",
            "message": "LLM test completed",
            "api_key_present": True,
            "api_key_length": len(settings.GOOGLE_API_KEY),
            "fallback_mode": is_fallback,
            "report_preview": report[:200] + "..." if len(report) > 200 else report,
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"LLM test failed: {str(e)}",
            "api_key_present": bool(settings.GOOGLE_API_KEY),
            "fallback_mode": True,
        }
