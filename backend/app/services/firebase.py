"""
Firebase authentication and Firestore operations
"""

import os
import json
from typing import Dict, List, Optional, Any
from datetime import datetime

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
        # Initialize Firebase
        cred_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            settings.FIREBASE_CREDENTIALS_PATH,
        )

        if not os.path.exists(cred_path):
            raise FileNotFoundError(
                f"Firebase credentials file not found at {cred_path}"
            )

        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)


class FirebaseService:
    """Firebase service for authentication and database operations"""

    def __init__(self):
        # Initialize Firebase first
        initialize_firebase()
        self.db = firestore.client()

    # Authentication methods
    async def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify Firebase ID token and return user data"""
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
        """Save survey result to Firestore"""
        try:
            survey_data["submission_date"] = firestore.SERVER_TIMESTAMP
            doc_ref = self.db.collection("surveys").document()
            doc_ref.set(survey_data)
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
        """Get surveys for a specific patient"""
        try:
            query = self.db.collection("surveys").where("patient_id", "==", patient_id)

            if survey_type:
                query = query.where("survey_type", "==", survey_type)

            # Add date filtering if needed
            if date_filter:
                # Convert date_filter to datetime for comparison
                # Implementation depends on date format
                pass

            docs = query.order_by(
                "submission_date", direction=firestore.Query.DESCENDING
            ).stream()

            results = []
            for doc in docs:
                data = doc.to_dict()
                data["survey_id"] = doc.id
                # Convert timestamp to ISO string
                if "submission_date" in data:
                    data["submission_date"] = data["submission_date"].isoformat()
                results.append(data)

            return results
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Failed to get patient surveys: {str(e)}"
            )

    async def get_all_patients_surveys(self) -> List[Dict[str, Any]]:
        """Get survey metadata for all patients (for dashboard)"""
        try:
            docs = self.db.collection("surveys").stream()

            # Group by patient
            patients_data = {}
            for doc in docs:
                data = doc.to_dict()
                patient_id = data["patient_id"]

                if patient_id not in patients_data:
                    patients_data[patient_id] = {
                        "patient_id": patient_id,
                        "surveys": [],
                    }

                survey_info = {
                    "survey_type": data["survey_type"],
                    "submission_date": data["submission_date"].isoformat()
                    if "submission_date" in data
                    else None,
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
            docs = (
                self.db.collection("surveys")
                .where("patient_id", "==", patient_id)
                .where("survey_type", "==", survey_type)
                .order_by("submission_date")
                .stream()
            )

            trend_data = []
            for doc in docs:
                data = doc.to_dict()
                trend_point = {
                    "submission_date": data["submission_date"].isoformat()
                    if "submission_date" in data
                    else None,
                    "score": data.get("score", 0),
                }
                trend_data.append(trend_point)

            return trend_data
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Failed to get survey trends: {str(e)}"
            )


# Global instance
firebase_service = FirebaseService()
