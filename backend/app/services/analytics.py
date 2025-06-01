"""
Analytics for dashboard (e.g., trends, averages)
"""

from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict, Counter

from app.services.firebase import firebase_service
from app.services.scoring import get_score_interpretation


class AnalyticsService:
    """Service for data analytics and reporting"""

    def __init__(self):
        self.firebase_service = firebase_service

    async def get_patient_statistics(self) -> Dict[str, Any]:
        """
        Get overall patient statistics

        Returns:
            Dict: Patient statistics
        """
        try:
            patients_data = await self.firebase_service.get_all_patients_surveys()

            total_patients = len(patients_data)
            active_patients = len([p for p in patients_data if p["surveys"]])

            # Calculate survey completion rates
            survey_counts = defaultdict(int)
            for patient_data in patients_data:
                completed_types = set(s["survey_type"] for s in patient_data["surveys"])
                for survey_type in completed_types:
                    survey_counts[survey_type] += 1

            # Available survey types
            available_surveys = ["AUDIT", "PSQI", "BDI", "BAI", "K-MDQ"]
            completion_rates = {}
            for survey_type in available_surveys:
                rate = (
                    (survey_counts[survey_type] / total_patients * 100)
                    if total_patients > 0
                    else 0
                )
                completion_rates[survey_type] = round(rate, 2)

            return {
                "total_patients": total_patients,
                "active_patients": active_patients,
                "inactive_patients": total_patients - active_patients,
                "completion_rates": completion_rates,
                "average_surveys_per_patient": round(
                    sum(len(p["surveys"]) for p in patients_data) / total_patients, 2
                )
                if total_patients > 0
                else 0,
            }

        except Exception as e:
            return {"error": f"Failed to get patient statistics: {str(e)}"}

    async def get_survey_score_analytics(self, survey_type: str) -> Dict[str, Any]:
        """
        Get analytics for a specific survey type

        Args:
            survey_type: Type of survey to analyze

        Returns:
            Dict: Survey analytics
        """
        try:
            patients_data = await self.firebase_service.get_all_patients_surveys()

            scores = []
            interpretations = []
            dates = []

            for patient_data in patients_data:
                for survey in patient_data["surveys"]:
                    if survey["survey_type"] == survey_type:
                        # Get full survey data for score
                        try:
                            full_surveys = (
                                await self.firebase_service.get_patient_surveys(
                                    patient_data["patient_id"], survey_type
                                )
                            )
                            for full_survey in full_surveys:
                                if full_survey["survey_id"] == survey["survey_id"]:
                                    score = full_survey["score"]
                                    scores.append(score)
                                    interpretations.append(
                                        get_score_interpretation(survey_type, score)
                                    )
                                    dates.append(survey["submission_date"])
                                    break
                        except:
                            continue

            if not scores:
                return {
                    "survey_type": survey_type,
                    "total_submissions": 0,
                    "message": "No data available",
                }

            # Calculate statistics
            avg_score = sum(scores) / len(scores)
            min_score = min(scores)
            max_score = max(scores)

            # Score distribution
            interpretation_counts = Counter(interpretations)

            # Trend analysis (last 6 months)
            recent_cutoff = datetime.now() - timedelta(days=180)
            recent_scores = []
            for i, date_str in enumerate(dates):
                try:
                    date_obj = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                    if date_obj >= recent_cutoff:
                        recent_scores.append(scores[i])
                except:
                    continue

            trend = "stable"
            if len(recent_scores) >= 2:
                recent_avg = sum(recent_scores) / len(recent_scores)
                if recent_avg > avg_score * 1.1:
                    trend = "increasing"
                elif recent_avg < avg_score * 0.9:
                    trend = "decreasing"

            return {
                "survey_type": survey_type,
                "total_submissions": len(scores),
                "statistics": {
                    "average_score": round(avg_score, 2),
                    "minimum_score": min_score,
                    "maximum_score": max_score,
                    "standard_deviation": round(self._calculate_std_dev(scores), 2),
                },
                "score_distribution": dict(interpretation_counts),
                "trend_analysis": {
                    "trend": trend,
                    "recent_submissions": len(recent_scores),
                    "recent_average": round(sum(recent_scores) / len(recent_scores), 2)
                    if recent_scores
                    else 0,
                },
            }

        except Exception as e:
            return {"error": f"Failed to get survey analytics: {str(e)}"}

    async def get_monthly_submission_trends(self) -> Dict[str, Any]:
        """
        Get monthly submission trends for all surveys

        Returns:
            Dict: Monthly trends data
        """
        try:
            patients_data = await self.firebase_service.get_all_patients_surveys()

            # Group submissions by month
            monthly_data = defaultdict(lambda: defaultdict(int))

            for patient_data in patients_data:
                for survey in patient_data["surveys"]:
                    try:
                        date_obj = datetime.fromisoformat(
                            survey["submission_date"].replace("Z", "+00:00")
                        )
                        month_key = date_obj.strftime("%Y-%m")
                        monthly_data[month_key][survey["survey_type"]] += 1
                        monthly_data[month_key]["total"] += 1
                    except:
                        continue

            # Convert to list format for frontend
            trend_data = []
            for month, surveys in sorted(monthly_data.items()):
                trend_data.append(
                    {
                        "month": month,
                        "total_submissions": surveys["total"],
                        "by_survey_type": {
                            k: v for k, v in surveys.items() if k != "total"
                        },
                    }
                )

            return {
                "monthly_trends": trend_data[-12:],  # Last 12 months
                "total_months": len(trend_data),
            }

        except Exception as e:
            return {"error": f"Failed to get submission trends: {str(e)}"}

    async def get_patient_risk_assessment(self) -> Dict[str, Any]:
        """
        Analyze patient risk levels across all surveys

        Returns:
            Dict: Risk assessment data
        """
        try:
            patients_data = await self.firebase_service.get_all_patients_surveys()

            risk_levels = {"low": 0, "moderate": 0, "high": 0, "unknown": 0}
            patient_risks = {}

            for patient_data in patients_data:
                patient_id = patient_data["patient_id"]
                patient_scores = {}

                # Get latest scores for each survey type
                for survey in patient_data["surveys"]:
                    survey_type = survey["survey_type"]
                    try:
                        full_surveys = await self.firebase_service.get_patient_surveys(
                            patient_id, survey_type
                        )
                        if full_surveys:
                            latest_score = full_surveys[0]["score"]  # First is latest
                            patient_scores[survey_type] = latest_score
                    except:
                        continue

                # Assess overall risk
                risk_level = self._assess_patient_risk(patient_scores)
                risk_levels[risk_level] += 1
                patient_risks[patient_id] = {
                    "risk_level": risk_level,
                    "scores": patient_scores,
                }

            return {
                "risk_distribution": risk_levels,
                "high_risk_patients": [
                    pid
                    for pid, data in patient_risks.items()
                    if data["risk_level"] == "high"
                ],
                "total_assessed": sum(risk_levels.values()),
            }

        except Exception as e:
            return {"error": f"Failed to get risk assessment: {str(e)}"}

    async def get_survey_completion_timeline(self, patient_id: str) -> Dict[str, Any]:
        """
        Get completion timeline for a specific patient

        Args:
            patient_id: Patient ID

        Returns:
            Dict: Patient's survey timeline
        """
        try:
            surveys = await self.firebase_service.get_patient_surveys(patient_id)

            if not surveys:
                return {"patient_id": patient_id, "timeline": [], "total_surveys": 0}

            # Sort by date and create timeline
            sorted_surveys = sorted(surveys, key=lambda x: x["submission_date"])

            timeline = []
            for survey in sorted_surveys:
                timeline.append(
                    {
                        "date": survey["submission_date"],
                        "survey_type": survey["survey_type"],
                        "score": survey["score"],
                        "interpretation": get_score_interpretation(
                            survey["survey_type"], survey["score"]
                        ),
                    }
                )

            # Calculate intervals between surveys
            intervals = []
            for i in range(1, len(timeline)):
                try:
                    prev_date = datetime.fromisoformat(
                        timeline[i - 1]["date"].replace("Z", "+00:00")
                    )
                    curr_date = datetime.fromisoformat(
                        timeline[i]["date"].replace("Z", "+00:00")
                    )
                    interval_days = (curr_date - prev_date).days
                    intervals.append(interval_days)
                except:
                    continue

            avg_interval = sum(intervals) / len(intervals) if intervals else 0

            return {
                "patient_id": patient_id,
                "timeline": timeline,
                "total_surveys": len(surveys),
                "survey_types": list(set(s["survey_type"] for s in surveys)),
                "date_range": {
                    "first_survey": timeline[0]["date"],
                    "last_survey": timeline[-1]["date"],
                },
                "average_interval_days": round(avg_interval, 1),
            }

        except Exception as e:
            return {"error": f"Failed to get completion timeline: {str(e)}"}

    def _calculate_std_dev(self, scores: List[float]) -> float:
        """Calculate standard deviation of scores"""
        if len(scores) < 2:
            return 0.0

        mean = sum(scores) / len(scores)
        variance = sum((x - mean) ** 2 for x in scores) / (len(scores) - 1)
        return variance**0.5

    def _assess_patient_risk(self, scores: Dict[str, float]) -> str:
        """
        Assess overall patient risk based on survey scores

        Args:
            scores: Dictionary of survey_type -> score

        Returns:
            str: Risk level (low, moderate, high, unknown)
        """
        if not scores:
            return "unknown"

        high_risk_indicators = 0
        total_assessments = 0

        # Define risk thresholds for each survey
        risk_thresholds = {
            "AUDIT": {"moderate": 8, "high": 16},
            "PSQI": {"moderate": 6, "high": 12},
            "BDI": {"moderate": 14, "high": 29},
            "BAI": {"moderate": 16, "high": 26},
            "K-MDQ": {"moderate": 7, "high": 10},
        }

        for survey_type, score in scores.items():
            if survey_type in risk_thresholds:
                total_assessments += 1
                thresholds = risk_thresholds[survey_type]

                if score >= thresholds["high"]:
                    high_risk_indicators += 2
                elif score >= thresholds["moderate"]:
                    high_risk_indicators += 1

        if total_assessments == 0:
            return "unknown"

        # Calculate risk ratio
        risk_ratio = high_risk_indicators / (total_assessments * 2)

        if risk_ratio >= 0.5:
            return "high"
        elif risk_ratio >= 0.25:
            return "moderate"
        else:
            return "low"


# Global instance
analytics_service = AnalyticsService()
