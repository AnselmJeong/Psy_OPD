"""
Firebase authentication and Firestore operations
"""

import os
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
import uuid
import asyncio

import firebase_admin
from firebase_admin import credentials, auth, firestore
from fastapi import HTTPException

from app.config.settings import settings


def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        # Check if Firebase is already initialized
        firebase_admin.get_app()
    except ValueError:
        # Initialize Firebase with proper path
        cred_path = os.path.join(
            os.path.dirname(
                os.path.dirname(os.path.dirname(__file__))
            ),  # Go to backend/
            settings.FIREBASE_CREDENTIALS_PATH,  # secret/psy-opd.json
        )

        if not os.path.exists(cred_path):
            raise FileNotFoundError(
                f"Firebase credentials file not found at {cred_path}"
            )

        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        print(f"Firebase initialized with credentials from {cred_path}")


# Define required survey types (front-end required scales)
REQUIRED_SURVEY_TYPES = {
    "demographic",
    "past_history",
    "demographic",  # ensure both naming conventions
    "past-history",
    "audit",
    "psqi",
    "bdi",
    "bai",
    "k-mdq",
    # Also include backend mapped names in upper-case for safety
    "DEMOGRAPHIC",
    "PAST_HISTORY",
    "AUDIT",
    "PSQI",
    "BDI",
    "BAI",
    "K-MDQ",
}


class FirebaseService:
    """Firebase service for authentication and database operations"""

    def __init__(self):
        # Initialize Firebase
        initialize_firebase()
        self.db = firestore.client()
        print("Using real Firestore client")

    # Authentication methods
    async def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify Firebase ID token and return user data"""
        # For development, allow mock tokens
        if token.startswith("mock_token_"):
            user_id = token.replace("mock_token_", "")
            return {"uid": user_id, "user_type": "patient"}

        try:
            decoded_token = auth.verify_id_token(token)
            return decoded_token
        except Exception as e:
            raise HTTPException(status_code=401, detail="Invalid token")

    async def create_user(
        self, user_id: str, password: str, email: Optional[str] = None
    ) -> str:
        """Create a new user in Firebase Auth"""
        try:
            user_record = auth.create_user(uid=user_id, email=email, password=password)
            return user_record.uid
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Failed to create user: {str(e)}"
            )

    async def update_password(self, user_id: str, new_password: str) -> bool:
        """Update user password"""
        try:
            auth.update_user(user_id, password=new_password)
            return True
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Failed to update password: {str(e)}"
            )

    async def verify_password(self, user_id: str, password: str) -> bool:
        """Verify user password (simplified for this implementation)"""
        # In a real implementation, you'd use Firebase Auth sign-in
        # For now, we'll check against stored user data
        try:
            user_doc = self.db.collection("users").document(user_id).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                # This is a simplified password check
                # In production, use proper Firebase Auth sign-in
                return user_data.get("password") == password
            return False
        except Exception:
            return False

    # User management methods
    async def create_user_profile(
        self, user_id: str, user_data: Dict[str, Any]
    ) -> bool:
        """Create user profile in Firestore"""
        try:
            user_data["created_at"] = firestore.SERVER_TIMESTAMP
            user_data["updated_at"] = firestore.SERVER_TIMESTAMP
            self.db.collection("users").document(user_id).set(user_data)
            return True
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Failed to create user profile: {str(e)}"
            )

    async def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile from Firestore"""
        try:
            doc = self.db.collection("users").document(user_id).get()
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Failed to get user profile: {str(e)}"
            )

    async def update_user_profile(
        self, user_id: str, update_data: Dict[str, Any]
    ) -> bool:
        """Update user profile in Firestore"""
        try:
            update_data["updated_at"] = firestore.SERVER_TIMESTAMP
            self.db.collection("users").document(user_id).update(update_data)
            return True
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Failed to update user profile: {str(e)}"
            )

    # Survey methods
    async def save_survey_result(self, survey_data: Dict[str, Any]) -> str:
        """Save survey result to Firestore following the structure:
        surveys/{patient_id}/{required|elective}/{auto_doc_id}
        """
        try:
            # Determine category (required vs elective)
            survey_type_raw = survey_data.get("survey_type", "")
            survey_type_key = str(survey_type_raw).lower()
            category = (
                "required"
                if survey_type_key in [t.lower() for t in REQUIRED_SURVEY_TYPES]
                else "elective"
            )

            # Add timestamp
            survey_data["submission_date"] = firestore.SERVER_TIMESTAMP

            patient_id = survey_data["patient_id"]
            # Build hierarchical path
            collection_ref = (
                self.db.collection("surveys").document(patient_id).collection(category)
            )

            doc_ref = collection_ref.document()  # Auto-generated ID
            doc_ref.set(survey_data)
            print(f"Survey saved: surveys/{patient_id}/{category}/{doc_ref.id}")
            return doc_ref.id
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Failed to save survey: {str(e)}"
            )

    async def get_patient_surveys(
        self,
        patient_id: str,
        survey_type: Optional[str] = None,
        date_filter: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get surveys for a specific patient from both required and elective subcollections"""
        try:
            categories = ["required", "elective"]
            all_results: List[Dict[str, Any]] = []

            for category in categories:
                col_ref = (
                    self.db.collection("surveys")
                    .document(patient_id)
                    .collection(category)
                )

                query = col_ref
                if survey_type:
                    query = query.where("survey_type", "==", survey_type)

                docs = query.stream()
                for doc in docs:
                    data = doc.to_dict()
                    data["survey_id"] = doc.id
                    data["category"] = category
                    # Convert timestamp to ISO string for consistency
                    if "submission_date" in data:
                        if hasattr(data["submission_date"], "isoformat"):
                            data["submission_date"] = data[
                                "submission_date"
                            ].isoformat()
                        else:
                            data["submission_date"] = str(data["submission_date"])
                    all_results.append(data)

            # Sort by submission_date descending
            all_results.sort(key=lambda x: x.get("submission_date", ""), reverse=True)

            return all_results
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Failed to get patient surveys: {str(e)}"
            )

    async def get_all_patients_surveys(self) -> List[Dict[str, Any]]:
        """Get survey metadata for all patients (for dashboard)"""
        try:
            categories = ["required", "elective"]
            patients_data: Dict[str, Any] = {}

            for category in categories:
                docs = self.db.collection_group(category).stream()

                for doc in docs:
                    data = doc.to_dict()
                    # Get patient_id from document path or data
                    patient_id = (
                        data.get("patient_id") or doc.reference.parent.parent.id
                    )
                    if not patient_id:
                        continue

                    if patient_id not in patients_data:
                        patients_data[patient_id] = {
                            "patient_id": patient_id,
                            "surveys": [],
                        }

                    survey_info = {
                        "survey_type": data.get("survey_type"),
                        "submission_date": data.get("submission_date").isoformat()
                        if hasattr(data.get("submission_date"), "isoformat")
                        else str(data.get("submission_date")),
                        "survey_id": doc.id,
                    }
                    patients_data[patient_id]["surveys"].append(survey_info)

            return list(patients_data.values())
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Failed to get patients surveys: {str(e)}"
            )

    async def get_survey_trends(
        self, patient_id: str, survey_type: str
    ) -> List[Dict[str, Any]]:
        """Get survey trend data for visualization"""
        try:
            categories = ["required", "elective"]
            trend_data: List[Dict[str, Any]] = []

            for category in categories:
                col_ref = (
                    self.db.collection("surveys")
                    .document(patient_id)
                    .collection(category)
                ).where("survey_type", "==", survey_type)

                docs = col_ref.order_by("submission_date").stream()
                for doc in docs:
                    data = doc.to_dict()
                    trend_point = {
                        "submission_date": data.get("submission_date").isoformat()
                        if hasattr(data.get("submission_date"), "isoformat")
                        else str(data.get("submission_date")),
                        "score": data.get("score", 0),
                    }
                    trend_data.append(trend_point)

            # Ensure results sorted by date
            trend_data.sort(key=lambda x: x.get("submission_date", ""))
            return trend_data
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Failed to get survey trends: {str(e)}"
            )

    async def get_patient_demographic_info(
        self, patient_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get patient demographic information from surveys collection"""
        try:
            # Look for DEMOGRAPHIC survey in required collection
            col_ref = (
                self.db.collection("surveys")
                .document(patient_id)
                .collection("required")
            )

            # Query for DEMOGRAPHIC survey type
            query = col_ref.where("survey_type", "==", "DEMOGRAPHIC")
            docs = list(query.stream())

            if docs:
                # Get the most recent demographic survey
                demographic_doc = max(
                    docs, key=lambda doc: doc.to_dict().get("submission_date", "")
                )
                demographic_data = demographic_doc.to_dict()

                print(
                    f"[DEBUG] Found demographic survey with keys: {list(demographic_data.keys())}"
                )

                # Extract responses which contain the actual demographic info
                responses = demographic_data.get("responses", {})
                print(f"[DEBUG] Demographic responses keys: {list(responses.keys())}")

                return responses

            print(f"[DEBUG] No DEMOGRAPHIC survey found for patient {patient_id}")
            return None

        except Exception as e:
            print(f"[DEBUG] Error fetching demographic info: {e}")
            return None

    async def save_total_summary(self, patient_id: str, total_summary: str):
        ref = (
            self.db.collection("surveys")
            .document(patient_id)
            .collection("required")
            .document("total_summary")
        )
        ref.set(
            {
                "summary": total_summary,
                "survey_type": "TOTAL_SUMMARY",
                "updated_at": datetime.utcnow(),
            }
        )

    async def get_total_summary(self, patient_id: str):
        ref = (
            self.db.collection("surveys")
            .document(patient_id)
            .collection("required")
            .document("total_summary")
        )
        loop = asyncio.get_event_loop()
        doc = await loop.run_in_executor(None, ref.get)
        if doc.exists:
            return doc.to_dict()
        return None


# Global instance
firebase_service = FirebaseService()
