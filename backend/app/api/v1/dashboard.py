"""
Dashboard endpoints (Clinician-only)
"""

from typing import List, Dict
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, date
from pydantic import BaseModel

from app.models.survey import PatientSurveyList, TrendData
from app.models.auth import TokenData
from app.services.firebase import firebase_service
from app.dependencies.auth import get_current_clinician
from app.services.llm import generate_total_summary

router = APIRouter()

# Define assessment categories based on frontend rating page
REQUIRED_ASSESSMENTS = ["BDI", "BAI", "AUDIT", "PSQI", "K-MDQ"]
ELECTIVE_ASSESSMENTS = ["OCI-R", "PCL-K-5"]

# Cache for patient demographic info to reduce Firebase calls
_patient_info_cache: Dict[str, Dict] = {}
_cache_timestamp: Dict[str, datetime] = {}
CACHE_EXPIRY_HOURS = 24  # Cache expires after 24 hours


def clear_expired_cache():
    """Clear expired cache entries"""
    current_time = datetime.now()
    expired_keys = [
        key
        for key, timestamp in _cache_timestamp.items()
        if (current_time - timestamp).total_seconds() > CACHE_EXPIRY_HOURS * 3600
    ]

    for key in expired_keys:
        _patient_info_cache.pop(key, None)
        _cache_timestamp.pop(key, None)


@router.post("/clear-cache")
async def clear_patient_cache(
    current_user: TokenData = Depends(get_current_clinician),
):
    """Clear patient demographic info cache manually (admin only)"""
    global _patient_info_cache, _cache_timestamp
    _patient_info_cache.clear()
    _cache_timestamp.clear()
    return {"message": "Patient cache cleared successfully"}


@router.get("/cache-status")
async def get_cache_status(
    current_user: TokenData = Depends(get_current_clinician),
):
    """Get current cache status for patient demographic info"""
    clear_expired_cache()  # Clean up first

    cache_info = {
        "total_cached_patients": len(_patient_info_cache),
        "cache_expiry_hours": CACHE_EXPIRY_HOURS,
        "cached_patients": [],
    }

    current_time = datetime.now()
    for patient_id, timestamp in _cache_timestamp.items():
        time_since_cached = (current_time - timestamp).total_seconds() / 3600  # hours
        cache_info["cached_patients"].append(
            {
                "patient_id": patient_id,
                "cached_hours_ago": round(time_since_cached, 2),
                "expires_in_hours": round(CACHE_EXPIRY_HOURS - time_since_cached, 2),
            }
        )

    return cache_info


@router.post("/preload-cache")
async def preload_patient_cache(
    current_user: TokenData = Depends(get_current_clinician),
):
    """Preload patient demographic info cache for all patients"""
    try:
        # Get all patient IDs from survey data
        patients_data = await firebase_service.get_all_patients_surveys()
        patient_ids = [p["patient_id"] for p in patients_data]

        # Preload demographic info for all patients
        loaded_count = 0
        errors = []

        for patient_id in patient_ids:
            try:
                await get_patient_demographic_info_cached(patient_id)
                loaded_count += 1
            except Exception as e:
                errors.append(f"Patient {patient_id}: {str(e)}")

        return {
            "message": f"Cache preloaded for {loaded_count} patients",
            "total_patients": len(patient_ids),
            "loaded_successfully": loaded_count,
            "errors_count": len(errors),
            "errors": errors[:5] if errors else [],  # Show first 5 errors only
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to preload cache: {str(e)}"
        )


def calculate_age_from_birth_date(birth_date_str: str) -> int:
    """Calculate age from birth date string (YYYY-MM-DD or YYYYMMDD format)"""
    try:
        if "-" in birth_date_str:
            # YYYY-MM-DD format
            year, month, day = map(int, birth_date_str.split("-"))
        elif len(birth_date_str) == 8:
            # YYYYMMDD format
            year = int(birth_date_str[:4])
            month = int(birth_date_str[4:6])
            day = int(birth_date_str[6:8])
        else:
            return 0

        birth_date = date(year, month, day)
        today = date.today()
        age = (
            today.year
            - birth_date.year
            - ((today.month, today.day) < (birth_date.month, birth_date.day))
        )
        return age
    except (ValueError, IndexError, TypeError):
        pass
    return 0


async def get_patient_demographic_info_cached(patient_id: str) -> Dict[str, any]:
    """Get patient demographic info with caching"""
    # Clear expired cache entries
    clear_expired_cache()

    # Check if we have cached data and it's not expired
    if patient_id in _patient_info_cache:
        cached_time = _cache_timestamp.get(patient_id)
        if (
            cached_time
            and (datetime.now() - cached_time).total_seconds()
            < CACHE_EXPIRY_HOURS * 3600
        ):
            return _patient_info_cache[patient_id]

    try:
        # Try to get demographic info from DEMOGRAPHIC survey first
        demographic_data = await firebase_service.get_patient_demographic_info(
            patient_id
        )

        if demographic_data:
            # Extract information from demographic survey responses
            name = (
                demographic_data.get("name")
                or demographic_data.get("이름")
                or demographic_data.get("환자명")
                or f"Patient {patient_id}"
            )

            # Handle gender field variations
            gender_raw = (
                demographic_data.get("gender")
                or demographic_data.get("성별")
                or demographic_data.get("sex")
                or "Unknown"
            )

            # Convert Korean gender values to English
            if gender_raw == "남" or gender_raw == "남성":
                gender = "남성"
            elif gender_raw == "여" or gender_raw == "여성":
                gender = "여성"
            else:
                gender = gender_raw

            # Calculate age from birth date if available
            age = 0
            birth_date = (
                demographic_data.get("birth_date")
                or demographic_data.get("date_of_birth")
                or demographic_data.get("생년월일")
                or demographic_data.get("birthDate")
            )

            if birth_date:
                age = calculate_age_from_birth_date(str(birth_date))

            result = {
                "name": name,
                "age": age,
                "gender": gender,
                "birth_date": birth_date,
            }
        else:
            # Fallback to user profile if no demographic survey
            try:
                profile = await firebase_service.get_user_profile(patient_id)
                demographic_info = (
                    profile.get("demographic_info", {}) if profile else {}
                )

                result = {
                    "name": demographic_info.get("name", f"Patient {patient_id}"),
                    "age": demographic_info.get("age", 0),
                    "gender": demographic_info.get("gender", "Unknown"),
                    "birth_date": demographic_info.get("date_of_birth"),
                }
            except:
                result = {
                    "name": f"Patient {patient_id}",
                    "age": 0,
                    "gender": "Unknown",
                    "birth_date": None,
                }

        # Cache the result with timestamp
        _patient_info_cache[patient_id] = result
        _cache_timestamp[patient_id] = datetime.now()
        return result

    except Exception as e:
        print(f"[DEBUG] Error getting demographic info for patient {patient_id}: {e}")
        # Return fallback info
        fallback = {
            "name": f"Patient {patient_id}",
            "age": 0,
            "gender": "Unknown",
            "birth_date": None,
        }
        _patient_info_cache[patient_id] = fallback
        _cache_timestamp[patient_id] = datetime.now()
        return fallback


# New models for enhanced dashboard
class PatientInfo(BaseModel):
    patient_id: str
    name: str
    age: int
    gender: str


class AssessmentStatus(BaseModel):
    status: str  # 'complete', 'in_progress', 'not_started'
    last_completion_date: str = None


class PatientAssessmentOverview(BaseModel):
    patient_id: str
    name: str
    age: int
    gender: str
    essential_assessments: AssessmentStatus
    elective_assessments: List[str]  # List of completed elective assessment names


@router.get("/patients-overview", response_model=List[PatientAssessmentOverview])
async def get_patients_overview(
    current_user: TokenData = Depends(get_current_clinician),
):
    """
    Retrieve enhanced patient overview with demographics and assessment status
    Clinician-only endpoint with caching for improved performance
    """
    try:
        # Get all patients' survey data
        patients_data = await firebase_service.get_all_patients_surveys()

        result = []
        for patient_data in patients_data:
            patient_id = patient_data["patient_id"]

            # Get patient demographic info using cached function
            demographic_info = await get_patient_demographic_info_cached(patient_id)

            name = demographic_info.get("name", f"Patient {patient_id}")
            age = demographic_info.get("age", 0)
            gender = demographic_info.get("gender", "Unknown")

            print(
                f"[DEBUG] Patient {patient_id}: name={name}, age={age}, gender={gender}"
            )

            # Analyze assessment status
            completed_surveys = set(
                survey["survey_type"] for survey in patient_data["surveys"]
            )

            # Check essential assessment status
            completed_required = sum(
                1 for req in REQUIRED_ASSESSMENTS if req in completed_surveys
            )
            total_required = len(REQUIRED_ASSESSMENTS)

            if completed_required == total_required:
                essential_status = "complete"
            elif completed_required > 0:
                essential_status = "in_progress"
            else:
                essential_status = "not_started"

            # Get last completion date for required assessments
            last_completion_date = None
            if completed_required > 0:
                required_surveys = [
                    s
                    for s in patient_data["surveys"]
                    if s["survey_type"] in REQUIRED_ASSESSMENTS
                ]
                if required_surveys:
                    last_completion_date = max(
                        s["submission_date"] for s in required_surveys
                    )

            # Get elective assessments (only those defined in ELECTIVE_ASSESSMENTS list)
            elective_assessments = [
                survey_type
                for survey_type in completed_surveys
                if survey_type in ELECTIVE_ASSESSMENTS
            ]

            patient_overview = PatientAssessmentOverview(
                patient_id=patient_id,
                name=name,
                age=age,
                gender=gender,
                essential_assessments=AssessmentStatus(
                    status=essential_status, last_completion_date=last_completion_date
                ),
                elective_assessments=elective_assessments,
            )
            result.append(patient_overview)

        # Sort by last completion date (most recent first), then by status
        def sort_key(patient):
            completion_date = patient.essential_assessments.last_completion_date
            status = patient.essential_assessments.status

            # For complete patients, use actual completion date for sorting
            # For others, use status priority with very old dates
            if status == "complete" and completion_date:
                # Convert to negative for reverse sorting (recent first)
                return (0, completion_date)
            elif status == "in_progress":
                return (1, completion_date or "0000-00-00")
            else:  # not_started
                return (2, "0000-00-00")

        # Sort with most recent completion dates first for completed assessments
        result.sort(key=sort_key, reverse=True)
        return result

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get patients overview: {str(e)}"
        )


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


@router.get("/patient/{patient_id}/trend-scales")
async def get_patient_trend_scales(
    patient_id: str,
    current_user: TokenData = Depends(get_current_clinician),
):
    """
    Get scales that have multiple submissions for a specific patient (for trend analysis)
    Clinician-only endpoint
    """
    try:
        # Get patient surveys
        surveys = await firebase_service.get_patient_surveys(patient_id)

        # Count surveys by type
        survey_type_counts = {}
        for survey in surveys:
            survey_type = survey["survey_type"]
            if survey_type.upper() not in ["DEMOGRAPHIC", "PAST_HISTORY"]:
                survey_type_counts[survey_type] = (
                    survey_type_counts.get(survey_type, 0) + 1
                )

        # Find scales with 2+ submissions
        trend_scales = [
            {"scale": survey_type, "count": count}
            for survey_type, count in survey_type_counts.items()
            if count >= 2
        ]

        # Get patient demographic info
        demographic_info = await get_patient_demographic_info_cached(patient_id)

        return {
            "patient_id": patient_id,
            "name": demographic_info.get("name", f"Patient {patient_id}"),
            "age": demographic_info.get("age", 0),
            "gender": demographic_info.get("gender", "Unknown"),
            "trend_scales": trend_scales,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get patient trend scales: {str(e)}"
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
        print(
            f"[DEBUG] Getting trends for patient {patient_id}, survey_type: {survey_type}"
        )

        # Get trend data from Firebase
        trend_data = await firebase_service.get_survey_trends(patient_id, survey_type)

        print(f"[DEBUG] Found {len(trend_data) if trend_data else 0} trend data points")

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
        print(f"[ERROR] Exception in get_patient_trends: {e}")
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


@router.get("/patient/{patient_id}/report")
async def get_patient_report(
    patient_id: str,
    current_user: TokenData = Depends(get_current_clinician),
):
    """
    Generate a comprehensive report for a patient based on their latest survey results
    Clinician-only endpoint
    """
    try:
        # Get all surveys for the patient
        all_surveys = await firebase_service.get_patient_surveys(patient_id)

        if not all_surveys:
            raise HTTPException(
                status_code=404, detail=f"No survey data found for patient {patient_id}"
            )

        # Filter out DEMOGRAPHIC and PAST_HISTORY surveys
        filtered_surveys = [
            survey
            for survey in all_surveys
            if survey["survey_type"].upper() not in ["DEMOGRAPHIC", "PAST_HISTORY"]
        ]

        # Group surveys by type and get the latest one for each type
        latest_surveys = {}
        for survey in filtered_surveys:
            survey_type = survey["survey_type"]
            if survey_type not in latest_surveys:
                latest_surveys[survey_type] = survey
            else:
                # Compare submission dates and keep the latest
                current_date = survey.get("submission_date", "")
                existing_date = latest_surveys[survey_type].get("submission_date", "")
                if current_date > existing_date:
                    latest_surveys[survey_type] = survey

        # Prepare scale summaries
        scale_summaries = {}
        for survey_type, survey in latest_surveys.items():
            scale_summaries[survey_type] = {
                "score": survey.get("score", None),
                "summary": survey.get("summary", ""),
                "submission_date": survey.get("submission_date", ""),
            }

        # Check if a saved total_summary exists
        saved_total_summary = await firebase_service.get_total_summary(patient_id)
        if saved_total_summary:
            total_summary = saved_total_summary.get("summary")
        else:
            # Generate total summary using LLM
            total_summary = generate_total_summary(scale_summaries, patient_id)

        return {
            "patient_id": patient_id,
            "scale_summaries": scale_summaries,
            "total_summary": total_summary,
            "generated_at": datetime.utcnow().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate patient report: {str(e)}"
        )
