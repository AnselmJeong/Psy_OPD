"""
Tests for interpretation service
"""

import pytest
import json
import tempfile
import os
from unittest.mock import patch, mock_open

from app.services.interpretation import interpret_rating_scale


class TestInterpretationService:
    """Test class for interpretation service"""

    @pytest.fixture
    def sample_criteria_data(self):
        """Sample criteria data for testing"""
        return {
            "assessments": [
                {
                    "name": "BDI",
                    "criteria": [
                        {
                            "range": [0, 9],
                            "category": "정상",
                            "description": "정상적인 상태입니다.",
                        },
                        {
                            "range": [10, 15],
                            "category": "가벼운 우울",
                            "description": "가벼운 우울 상태입니다.",
                        },
                        {
                            "range": [16, 25],
                            "category": "중등도 우울",
                            "description": "중등도 우울 상태입니다.",
                        },
                        {
                            "range": [26, 63],
                            "category": "심한 우울",
                            "description": "심한 우울 상태입니다.",
                        },
                    ],
                },
                {
                    "name": "AUDIT",
                    "criteria_by_gender": {
                        "남": [
                            {
                                "range": [0, 9],
                                "category": "정상음주",
                                "description": "'정상음주군'에 속하고 있으며, 비교적 건강하고 안전한 음주습관을 가지고 있습니다.",
                            },
                            {
                                "range": [10, 19],
                                "category": "위험음주",
                                "description": "'위험음주군'으로 음주에 대한 단기개입과 지속적인 모니터링이 필요합니다.",
                            },
                            {
                                "range": [20, None],
                                "category": "알코올사용장애",
                                "description": "알코올사용장애가 의심됩니다.",
                            },
                        ],
                        "여": [
                            {
                                "range": [0, 5],
                                "category": "정상음주",
                                "description": "'정상음주군'에 속하고 있으며, 비교적 건강하고 안전한 음주습관을 가지고 있습니다.",
                            },
                            {
                                "range": [6, 9],
                                "category": "위험음주",
                                "description": "'위험음주군'으로 음주에 대한 단기개입과 지속적인 모니터링이 필요합니다.",
                            },
                            {
                                "range": [10, None],
                                "category": "알코올사용장애",
                                "description": "알코올사용장애가 의심됩니다.",
                            },
                        ],
                    },
                },
                {
                    "name": "K-MDQ",
                    "criteria": [
                        {
                            "threshold": 7,
                            "category": "조울증 의심",
                            "description": "조울증일 확률이 높습니다.",
                            "additional_condition": {
                                "field": "simultaneity",
                                "value": "예",
                                "description": "simultaneity에서 예라고 대답해야 조울증 의심 조건이 충족됩니다.",
                            },
                        }
                    ],
                },
                {
                    "name": "OCI-R",
                    "criteria": [
                        {
                            "threshold": 21,
                            "category": "유의한 강박장애",
                            "description": "유의한 강박장애가 의심됩니다.",
                        }
                    ],
                },
            ]
        }

    def test_bdi_interpretation_normal(self, sample_criteria_data):
        """Test BDI interpretation for normal range"""
        mock_data = json.dumps(sample_criteria_data)

        with patch("builtins.open", mock_open(read_data=mock_data)):
            result = interpret_rating_scale("BDI", 5)

        assert result["category"] == "정상"
        assert result["description"] == "정상적인 상태입니다."

    def test_bdi_interpretation_mild_depression(self, sample_criteria_data):
        """Test BDI interpretation for mild depression"""
        mock_data = json.dumps(sample_criteria_data)

        with patch("builtins.open", mock_open(read_data=mock_data)):
            result = interpret_rating_scale("BDI", 12)

        assert result["category"] == "가벼운 우울"
        assert result["description"] == "가벼운 우울 상태입니다."

    def test_bdi_interpretation_moderate_depression(self, sample_criteria_data):
        """Test BDI interpretation for moderate depression"""
        mock_data = json.dumps(sample_criteria_data)

        with patch("builtins.open", mock_open(read_data=mock_data)):
            result = interpret_rating_scale("BDI", 20)

        assert result["category"] == "중등도 우울"
        assert result["description"] == "중등도 우울 상태입니다."

    def test_bdi_interpretation_severe_depression(self, sample_criteria_data):
        """Test BDI interpretation for severe depression"""
        mock_data = json.dumps(sample_criteria_data)

        with patch("builtins.open", mock_open(read_data=mock_data)):
            result = interpret_rating_scale("BDI", 30)

        assert result["category"] == "심한 우울"
        assert result["description"] == "심한 우울 상태입니다."

    def test_audit_interpretation_male_normal(self, sample_criteria_data):
        """Test AUDIT interpretation for normal male drinking"""
        mock_data = json.dumps(sample_criteria_data)

        with patch("builtins.open", mock_open(read_data=mock_data)):
            result = interpret_rating_scale("AUDIT", 5, gender="남")

        assert result["category"] == "정상음주"
        assert "정상음주군" in result["description"]

    def test_audit_interpretation_male_risky(self, sample_criteria_data):
        """Test AUDIT interpretation for risky male drinking"""
        mock_data = json.dumps(sample_criteria_data)

        with patch("builtins.open", mock_open(read_data=mock_data)):
            result = interpret_rating_scale("AUDIT", 15, gender="남")

        assert result["category"] == "위험음주"
        assert "위험음주군" in result["description"]

    def test_audit_interpretation_male_disorder(self, sample_criteria_data):
        """Test AUDIT interpretation for alcohol use disorder in males"""
        mock_data = json.dumps(sample_criteria_data)

        with patch("builtins.open", mock_open(read_data=mock_data)):
            result = interpret_rating_scale("AUDIT", 25, gender="남")

        assert result["category"] == "알코올사용장애"
        assert "알코올사용장애가 의심됩니다" in result["description"]

    def test_audit_interpretation_female_normal(self, sample_criteria_data):
        """Test AUDIT interpretation for normal female drinking"""
        mock_data = json.dumps(sample_criteria_data)

        with patch("builtins.open", mock_open(read_data=mock_data)):
            result = interpret_rating_scale("AUDIT", 3, gender="여")

        assert result["category"] == "정상음주"

    def test_audit_interpretation_female_risky(self, sample_criteria_data):
        """Test AUDIT interpretation for risky female drinking"""
        mock_data = json.dumps(sample_criteria_data)

        with patch("builtins.open", mock_open(read_data=mock_data)):
            result = interpret_rating_scale("AUDIT", 7, gender="여")

        assert result["category"] == "위험음주"

    def test_audit_interpretation_female_disorder(self, sample_criteria_data):
        """Test AUDIT interpretation for alcohol use disorder in females"""
        mock_data = json.dumps(sample_criteria_data)

        with patch("builtins.open", mock_open(read_data=mock_data)):
            result = interpret_rating_scale("AUDIT", 15, gender="여")

        assert result["category"] == "알코올사용장애"

    def test_k_mdq_interpretation_positive_with_condition(self, sample_criteria_data):
        """Test K-MDQ interpretation with positive screen and additional condition"""
        mock_data = json.dumps(sample_criteria_data)

        with patch("builtins.open", mock_open(read_data=mock_data)):
            result = interpret_rating_scale(
                "K-MDQ", 8, additional_conditions={"simultaneity": "예"}
            )

        assert result["category"] == "조울증 의심"
        assert "조울증일 확률이 높습니다" in result["description"]

    def test_k_mdq_interpretation_positive_without_condition(
        self, sample_criteria_data
    ):
        """Test K-MDQ interpretation with positive score but wrong additional condition"""
        mock_data = json.dumps(sample_criteria_data)

        with patch("builtins.open", mock_open(read_data=mock_data)):
            result = interpret_rating_scale(
                "K-MDQ", 8, additional_conditions={"simultaneity": "아니오"}
            )

        assert result["category"] == "조건 불충족"
        assert "simultaneity 값이" in result["description"]

    def test_k_mdq_interpretation_below_threshold(self, sample_criteria_data):
        """Test K-MDQ interpretation below threshold"""
        mock_data = json.dumps(sample_criteria_data)

        with patch("builtins.open", mock_open(read_data=mock_data)):
            result = interpret_rating_scale("K-MDQ", 5)

        assert result["category"] == "정상"
        assert "임계값 미만" in result["description"]

    def test_oci_r_interpretation_positive(self, sample_criteria_data):
        """Test OCI-R interpretation for positive screen"""
        mock_data = json.dumps(sample_criteria_data)

        with patch("builtins.open", mock_open(read_data=mock_data)):
            result = interpret_rating_scale("OCI-R", 25)

        assert result["category"] == "유의한 강박장애"
        assert "유의한 강박장애가 의심됩니다" in result["description"]

    def test_oci_r_interpretation_below_threshold(self, sample_criteria_data):
        """Test OCI-R interpretation below threshold"""
        mock_data = json.dumps(sample_criteria_data)

        with patch("builtins.open", mock_open(read_data=mock_data)):
            result = interpret_rating_scale("OCI-R", 15)

        assert result["category"] == "정상"
        assert "임계값 미만" in result["description"]

    def test_unknown_assessment(self, sample_criteria_data):
        """Test interpretation with unknown assessment name"""
        mock_data = json.dumps(sample_criteria_data)

        with patch("builtins.open", mock_open(read_data=mock_data)):
            result = interpret_rating_scale("UNKNOWN_SCALE", 10)

        assert "error" in result
        assert "not found" in result["error"]

    def test_audit_without_gender(self, sample_criteria_data):
        """Test AUDIT interpretation without required gender"""
        mock_data = json.dumps(sample_criteria_data)

        with patch("builtins.open", mock_open(read_data=mock_data)):
            result = interpret_rating_scale("AUDIT", 10)

        assert "error" in result
        assert "Gender is required" in result["error"]

    def test_audit_invalid_gender(self, sample_criteria_data):
        """Test AUDIT interpretation with invalid gender"""
        mock_data = json.dumps(sample_criteria_data)

        with patch("builtins.open", mock_open(read_data=mock_data)):
            result = interpret_rating_scale("AUDIT", 10, gender="기타")

        assert "error" in result
        assert "Invalid gender" in result["error"]

    def test_k_mdq_without_additional_conditions(self, sample_criteria_data):
        """Test K-MDQ interpretation without required additional conditions"""
        mock_data = json.dumps(sample_criteria_data)

        with patch("builtins.open", mock_open(read_data=mock_data)):
            result = interpret_rating_scale("K-MDQ", 8)

        assert "error" in result
        assert "Additional conditions required" in result["error"]

    def test_boundary_values_bdi(self, sample_criteria_data):
        """Test BDI interpretation at boundary values"""
        mock_data = json.dumps(sample_criteria_data)

        # Test boundary between normal and mild depression
        with patch("builtins.open", mock_open(read_data=mock_data)):
            result_9 = interpret_rating_scale("BDI", 9)
            result_10 = interpret_rating_scale("BDI", 10)

        assert result_9["category"] == "정상"
        assert result_10["category"] == "가벼운 우울"

    def test_boundary_values_audit_male(self, sample_criteria_data):
        """Test AUDIT interpretation at boundary values for males"""
        mock_data = json.dumps(sample_criteria_data)

        with patch("builtins.open", mock_open(read_data=mock_data)):
            result_9 = interpret_rating_scale("AUDIT", 9, gender="남")
            result_10 = interpret_rating_scale("AUDIT", 10, gender="남")
            result_19 = interpret_rating_scale("AUDIT", 19, gender="남")
            result_20 = interpret_rating_scale("AUDIT", 20, gender="남")

        assert result_9["category"] == "정상음주"
        assert result_10["category"] == "위험음주"
        assert result_19["category"] == "위험음주"
        assert result_20["category"] == "알코올사용장애"

    def test_file_not_found_error(self):
        """Test behavior when JSON file is not found"""
        with patch("builtins.open", side_effect=FileNotFoundError("File not found")):
            with pytest.raises(FileNotFoundError):
                interpret_rating_scale("BDI", 10)

    def test_invalid_json_format(self):
        """Test behavior with invalid JSON format"""
        invalid_json = "{ invalid json format"

        with patch("builtins.open", mock_open(read_data=invalid_json)):
            with pytest.raises(json.JSONDecodeError):
                interpret_rating_scale("BDI", 10)

    def test_missing_assessments_key(self):
        """Test behavior when JSON doesn't have assessments key"""
        invalid_data = json.dumps({"not_assessments": []})

        with patch("builtins.open", mock_open(read_data=invalid_data)):
            with pytest.raises(KeyError):
                interpret_rating_scale("BDI", 10)


class TestInterpretationIntegration:
    """Integration tests using real JSON file"""

    def test_real_json_file_bdi(self):
        """Test with real scoring_criteria.json file for BDI"""
        # This test uses the actual JSON file
        result = interpret_rating_scale("BDI", 12)

        assert "category" in result
        assert "description" in result
        assert result["category"] in ["정상", "가벼운 우울", "중등도 우울", "심한 우울"]

    def test_real_json_file_audit_male(self):
        """Test with real scoring_criteria.json file for AUDIT male"""
        result = interpret_rating_scale("AUDIT", 15, gender="남")

        assert "category" in result
        assert "description" in result
        assert result["category"] in ["정상음주", "위험음주", "알코올사용장애"]

    def test_real_json_file_audit_female(self):
        """Test with real scoring_criteria.json file for AUDIT female"""
        result = interpret_rating_scale("AUDIT", 7, gender="여")

        assert "category" in result
        assert "description" in result

    def test_real_json_file_k_mdq(self):
        """Test with real scoring_criteria.json file for K-MDQ"""
        result = interpret_rating_scale(
            "K-MDQ", 8, additional_conditions={"simultaneity": "예"}
        )

        assert "category" in result
        assert "description" in result

    def test_real_json_file_all_assessments(self):
        """Test that all assessments in the JSON file can be interpreted"""
        # Test each assessment type with a sample score
        test_cases = [
            ("BDI", 12, None, None),
            ("BAI", 10, None, None),
            ("AUDIT", 8, "남", None),
            ("AUDIT", 8, "여", None),
            ("K-MDQ", 8, None, {"simultaneity": "예"}),
            ("GDS", 15, None, None),
            ("GDS-SF", 7, None, None),
            ("OCI-R", 25, None, None),
        ]

        for assessment, score, gender, additional_conditions in test_cases:
            result = interpret_rating_scale(
                assessment, score, gender, additional_conditions
            )

            # Should not contain error
            assert "error" not in result or result.get("category") is not None
            assert "category" in result or "error" in result
            assert "description" in result or "error" in result
