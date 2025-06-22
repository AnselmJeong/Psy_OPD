"""
Patient endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from app.models.auth import TokenData
from app.services.firebase import firebase_service
from app.services.llm import generate_total_summary
from app.dependencies.auth import get_current_patient
from datetime import datetime
import traceback

router = APIRouter()


@router.get("/report")
async def get_patient_report(
    current_user: TokenData = Depends(get_current_patient),
):
    """
    Get the patient's own report
    Patient-only endpoint
    """
    try:
        # print("[DEBUG] 1. get_patient_report called for user:", current_user.user_id)
        all_surveys = await firebase_service.get_patient_surveys(current_user.user_id)
        # print(f"[DEBUG] 2. all_surveys: {all_surveys}")

        if not all_surveys:
            # print("[DEBUG] 3. No survey data found")
            raise HTTPException(status_code=404, detail="No survey data found")

        filtered_surveys = [
            survey
            for survey in all_surveys
            if "survey_type" in survey
            and survey["survey_type"].upper()
            not in ["DEMOGRAPHIC", "PAST_HISTORY", "TOTAL_SUMMARY"]
        ]
        # print(f"[DEBUG] 4. filtered_surveys: {filtered_surveys}")

        latest_surveys = {}
        for survey in filtered_surveys:
            survey_type = survey["survey_type"]
            if survey_type not in latest_surveys:
                latest_surveys[survey_type] = survey
            else:
                current_date = survey.get("submission_date", "")
                existing_date = latest_surveys[survey_type].get("submission_date", "")
                if current_date > existing_date:
                    latest_surveys[survey_type] = survey
        # print(f"[DEBUG] 5. latest_surveys: {latest_surveys}")

        scale_summaries = {}
        for survey_type, survey in latest_surveys.items():
            scale_summaries[survey_type] = {
                "score": survey.get("score", None),
                "summary": survey.get("summary", ""),
                "submission_date": survey.get("submission_date", ""),
            }
        # print(f"[DEBUG] 6. scale_summaries: {scale_summaries}")

        saved_total_summary = await firebase_service.get_total_summary(
            current_user.user_id
        )
        # print(
        #     f"[DEBUG] 7. saved_total_summary: {saved_total_summary} (type: {type(saved_total_summary)})"
        # )
        if saved_total_summary and isinstance(saved_total_summary, dict):
            total_summary = saved_total_summary.get("summary")
            # print(f"[DEBUG] 8. total_summary from Firestore: {total_summary}")
        else:
            from app.services.llm import generate_total_summary
            import asyncio

            total_summary = generate_total_summary(
                scale_summaries, current_user.user_id
            )
            # print(f"[DEBUG] 9. total_summary from LLM: {total_summary}")
            asyncio.create_task(
                firebase_service.save_total_summary(current_user.user_id, total_summary)
            )

        result = {
            "patient_id": current_user.user_id,
            "scale_summaries": scale_summaries,
            "total_summary": total_summary,
            "generated_at": datetime.utcnow().isoformat(),
        }
        # print(f"[DEBUG] 10. Returning result: {result}")
        return result

    except HTTPException:
        print("[DEBUG] HTTPException raised")
        raise
    except Exception as e:
        print("[ERROR] Exception in get_patient_report:", traceback.format_exc())
        raise HTTPException(
            status_code=500, detail=f"Failed to generate patient report: {str(e)}"
        )


@router.get("/debug/{patient_id}")
async def debug_patient_data(
    patient_id: str,
    current_user: TokenData = Depends(get_current_patient),
):
    """
    Debug endpoint to check Firebase structure
    """
    try:
        print(f"[DEBUG] Checking Firebase structure for patient: {patient_id}")

        # Check patients collection
        patient_doc = (
            firebase_service.db.collection("patients").document(patient_id).get()
        )
        if patient_doc.exists:
            patient_data = patient_doc.to_dict()
            # print(f"[DEBUG] Patient document data: {patient_data}")

            # Check for subcollections
            collections = patient_doc.reference.collections()
            subcollections = []
            for col in collections:
                subcollections.append(col.id)
            # print(f"[DEBUG] Patient subcollections: {subcollections}")

            # Try to get surveys subcollection
            if "surveys" in subcollections:
                surveys_ref = (
                    firebase_service.db.collection("patients")
                    .document(patient_id)
                    .collection("surveys")
                )
                surveys_docs = surveys_ref.stream()
                surveys_data = []
                for doc in surveys_docs:
                    surveys_data.append({"id": doc.id, "data": doc.to_dict()})
                # print(f"[DEBUG] Surveys subcollection data: {surveys_data}")

                return {
                    "patient_exists": True,
                    "patient_data": patient_data,
                    "subcollections": subcollections,
                    "surveys_data": surveys_data,
                }
            else:
                return {
                    "patient_exists": True,
                    "patient_data": patient_data,
                    "subcollections": subcollections,
                    "surveys_data": "No surveys subcollection found",
                }
        else:
            print(f"[DEBUG] Patient document does not exist")
            return {"patient_exists": False, "message": "Patient document not found"}

    except Exception as e:
        print(f"[DEBUG] Error in debug endpoint: {str(e)}")
        return {"error": str(e)}


@router.get("/debug-all")
async def debug_all_structures(
    current_user: TokenData = Depends(get_current_patient),
):
    """
    Debug endpoint to check all Firebase structures
    """
    try:
        # print(f"[DEBUG] Checking all Firebase structures")

        results = {}

        # Check surveys collection structure
        try:
            surveys_collection = firebase_service.db.collection("surveys")
            surveys_docs = surveys_collection.limit(5).stream()
            surveys_structure = []
            for doc in surveys_docs:
                doc_data = doc.to_dict()
                surveys_structure.append({"document_id": doc.id, "data": doc_data})
            results["surveys_collection"] = surveys_structure
        except Exception as e:
            results["surveys_collection"] = f"Error: {str(e)}"

        # Test get_all_patients_surveys function
        try:
            all_patients = await firebase_service.get_all_patients_surveys()
            results["all_patients_surveys"] = all_patients[:2]  # First 2 patients
        except Exception as e:
            results["all_patients_surveys"] = f"Error: {str(e)}"

        # Check collection groups
        try:
            # Try collection group queries
            required_docs = (
                firebase_service.db.collection_group("required").limit(5).stream()
            )
            required_data = []
            for doc in required_docs:
                required_data.append(
                    {
                        "document_id": doc.id,
                        "path": doc.reference.path,
                        "data": doc.to_dict(),
                    }
                )
            results["collection_group_required"] = required_data

            elective_docs = (
                firebase_service.db.collection_group("elective").limit(5).stream()
            )
            elective_data = []
            for doc in elective_docs:
                elective_data.append(
                    {
                        "document_id": doc.id,
                        "path": doc.reference.path,
                        "data": doc.to_dict(),
                    }
                )
            results["collection_group_elective"] = elective_data
        except Exception as e:
            results["collection_groups"] = f"Error: {str(e)}"

        return results

    except Exception as e:
        print(f"[DEBUG] Error in debug-all endpoint: {str(e)}")
        return {"error": str(e)}
