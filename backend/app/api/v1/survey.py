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
from app.services.scoring import score_survey
from app.services.llm import llm_service
from app.dependencies.auth import get_current_user, verify_patient_access

router = APIRouter()


@router.post("/submit", response_model=SurveySubmitResponse)
async def submit_survey(request: SurveySubmitRequest):
    """
    Process and store a patient's survey response
    """
    try:
        # Verify token from request body (for compatibility with frontend)
        decoded_token = await firebase_service.verify_token(request.token)

        # Verify the token belongs to the patient submitting the survey
        if decoded_token.get("uid") != request.patient_id:
            raise HTTPException(
                status_code=401, detail="Token does not match patient ID"
            )

        # Score the survey
        score = score_survey(request.survey_type, request.responses)

        # Generate summary using LLM
        summary = await llm_service.generate_summary(
            request.survey_type, request.responses, score
        )

        # Prepare survey data for storage
        survey_data = {
            "patient_id": request.patient_id,
            "survey_type": request.survey_type,
            "responses": request.responses,
            "score": score,
            "summary": summary,
        }

        # Save to Firebase
        survey_id = await firebase_service.save_survey_result(survey_data)

        return SurveySubmitResponse(survey_id=survey_id, score=score, summary=summary)

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
        # Verify access permissions
        verify_patient_access(patient_id, current_user)

        # Get surveys from Firebase
        surveys = await firebase_service.get_patient_surveys(
            patient_id, survey_type, date
        )

        # Convert to response model
        results = []
        for survey in surveys:
            result = SurveyResult(
                survey_id=survey["survey_id"],
                survey_type=survey["survey_type"],
                submission_date=survey["submission_date"],
                score=survey["score"],
                summary=survey["summary"],
                responses=survey["responses"],
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
                title="Alcohol Use Disorders Identification Test",
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
