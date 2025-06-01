"""
Dashboard endpoints (Clinician-only)
"""

from typing import List
from fastapi import APIRouter, HTTPException, Depends, Query

from app.models.survey import PatientSurveyList, TrendData
from app.models.auth import TokenData
from app.services.firebase import firebase_service
from app.dependencies.auth import get_current_clinician

router = APIRouter()


@router.get("/patients", response_model=List[PatientSurveyList])
async def get_patients_list(current_user: TokenData = Depends(get_current_clinician)):
    """
    Retrieve a list of all patients and their survey metadata
    Clinician-only endpoint
    """
    try:
        # Get all patients' survey data
        patients_data = await firebase_service.get_all_patients_surveys()

        # Convert to response model
        result = []
        for patient_data in patients_data:
            patient_surveys = PatientSurveyList(
                patient_id=patient_data["patient_id"], surveys=patient_data["surveys"]
            )
            result.append(patient_surveys)

        return result

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get patients list: {str(e)}"
        )


@router.get("/patient/{patient_id}/trends", response_model=TrendData)
async def get_patient_trends(
    patient_id: str,
    survey_type: str = Query(..., description="Survey type for trend analysis"),
    current_user: TokenData = Depends(get_current_clinician),
):
    """
    Retrieve data for visualizing a patient's survey scores over time as a line graph
    Clinician-only endpoint
    """
    try:
        # Get trend data from Firebase
        trend_data = await firebase_service.get_survey_trends(patient_id, survey_type)

        if not trend_data:
            raise HTTPException(
                status_code=404,
                detail=f"No trend data found for patient {patient_id} and survey type {survey_type}",
            )

        return TrendData(
            patient_id=patient_id, survey_type=survey_type, trend_data=trend_data
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get patient trends: {str(e)}"
        )


@router.get("/analytics")
async def get_dashboard_analytics(
    current_user: TokenData = Depends(get_current_clinician),
):
    """
    Get aggregated analytics for the dashboard
    Clinician-only endpoint
    """
    try:
        # Get all surveys for analytics
        all_patients_data = await firebase_service.get_all_patients_surveys()

        # Calculate analytics
        total_patients = len(all_patients_data)
        total_surveys = sum(len(patient["surveys"]) for patient in all_patients_data)

        # Survey type distribution
        survey_type_counts = {}
        all_scores = {}

        for patient_data in all_patients_data:
            for survey in patient_data["surveys"]:
                survey_type = survey["survey_type"]

                # Count survey types
                survey_type_counts[survey_type] = (
                    survey_type_counts.get(survey_type, 0) + 1
                )

                # Collect scores for average calculation
                if survey_type not in all_scores:
                    all_scores[survey_type] = []

                # Get score from full survey data
                try:
                    surveys = await firebase_service.get_patient_surveys(
                        patient_data["patient_id"], survey_type
                    )
                    for s in surveys:
                        if s["survey_id"] == survey["survey_id"]:
                            all_scores[survey_type].append(s["score"])
                            break
                except:
                    pass

        # Calculate average scores
        average_scores = {}
        for survey_type, scores in all_scores.items():
            if scores:
                average_scores[survey_type] = sum(scores) / len(scores)

        # Calculate completion rates (simplified)
        completion_rates = {}
        for survey_type, count in survey_type_counts.items():
            completion_rates[survey_type] = (
                (count / total_patients * 100) if total_patients > 0 else 0
            )

        analytics = {
            "total_patients": total_patients,
            "total_surveys": total_surveys,
            "survey_type_distribution": survey_type_counts,
            "average_scores": average_scores,
            "completion_rates": completion_rates,
            "surveys_per_patient": total_surveys / total_patients
            if total_patients > 0
            else 0,
        }

        return analytics

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get analytics: {str(e)}"
        )


@router.get("/patient/{patient_id}/export")
async def export_patient_data(
    patient_id: str,
    format: str = Query("csv", description="Export format: csv or json"),
    survey_type: str = Query(None, description="Filter by survey type"),
    current_user: TokenData = Depends(get_current_clinician),
):
    """
    Export a patient's survey data
    Clinician-only endpoint
    """
    try:
        # Get patient surveys
        surveys = await firebase_service.get_patient_surveys(patient_id, survey_type)

        if not surveys:
            raise HTTPException(status_code=404, detail="No data found for patient")

        if format.lower() == "json":
            # Return JSON format
            return {
                "patient_id": patient_id,
                "export_date": "2024-01-01T00:00:00Z",  # Current timestamp
                "surveys": surveys,
            }

        elif format.lower() == "csv":
            # Convert to CSV format
            import csv
            import io
            from fastapi.responses import StreamingResponse

            output = io.StringIO()
            writer = csv.writer(output)

            # Write headers
            headers = [
                "Patient ID",
                "Survey ID",
                "Survey Type",
                "Submission Date",
                "Score",
                "Summary",
            ]
            writer.writerow(headers)

            # Write data
            for survey in surveys:
                row = [
                    survey["patient_id"],
                    survey["survey_id"],
                    survey["survey_type"],
                    survey["submission_date"],
                    survey["score"],
                    survey["summary"]
                    .replace("\n", " ")
                    .replace(",", ";"),  # Clean summary for CSV
                ]
                writer.writerow(row)

            output.seek(0)

            return StreamingResponse(
                io.BytesIO(output.getvalue().encode()),
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename=patient_{patient_id}_surveys.csv"
                },
            )

        else:
            raise HTTPException(
                status_code=400, detail="Unsupported format. Use 'csv' or 'json'"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to export patient data: {str(e)}"
        )


@router.get("/recent-activity")
async def get_recent_activity(
    limit: int = Query(10, description="Number of recent activities to return"),
    current_user: TokenData = Depends(get_current_clinician),
):
    """
    Get recent survey submissions across all patients
    Clinician-only endpoint
    """
    try:
        # Get all patients' data
        all_patients_data = await firebase_service.get_all_patients_surveys()

        # Collect all surveys with timestamps
        all_activities = []
        for patient_data in all_patients_data:
            for survey in patient_data["surveys"]:
                activity = {
                    "patient_id": patient_data["patient_id"],
                    "survey_type": survey["survey_type"],
                    "submission_date": survey["submission_date"],
                    "survey_id": survey["survey_id"],
                }
                all_activities.append(activity)

        # Sort by submission date (newest first)
        all_activities.sort(key=lambda x: x["submission_date"], reverse=True)

        # Return limited results
        return {
            "recent_activities": all_activities[:limit],
            "total_activities": len(all_activities),
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get recent activity: {str(e)}"
        )


@router.get("/patient/{patient_id}/profile")
async def get_patient_profile(
    patient_id: str, current_user: TokenData = Depends(get_current_clinician)
):
    """
    Get patient profile information for clinician view
    Clinician-only endpoint
    """
    try:
        # Get patient profile
        profile = await firebase_service.get_user_profile(patient_id)

        if not profile:
            raise HTTPException(status_code=404, detail="Patient profile not found")

        # Get patient's survey summary
        surveys = await firebase_service.get_patient_surveys(patient_id)

        # Remove sensitive information and add summary
        clinician_view = {
            "patient_id": patient_id,
            "user_type": profile.get("user_type"),
            "demographic_info": profile.get("demographic_info", {}),
            "psychiatric_history": profile.get("psychiatric_history", {}),
            "survey_summary": {
                "total_surveys": len(surveys),
                "survey_types": list(set(s["survey_type"] for s in surveys)),
                "latest_survey_date": max([s["submission_date"] for s in surveys])
                if surveys
                else None,
            },
        }

        return clinician_view

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get patient profile: {str(e)}"
        )
