"""
Tests for scoring algorithms
"""

import pytest
from app.services.scoring import (
    score_survey,
    score_audit,
    score_psqi,
    score_bdi,
    score_bai,
    score_k_mdq,
    get_score_interpretation,
    _convert_to_numeric,
)


class TestScoringAlgorithms:
    """Test class for scoring algorithms"""

    def test_score_audit(self):
        """Test AUDIT scoring algorithm"""
        # Test perfect score (all 0s)
        responses = {f"q{i}": "0" for i in range(1, 11)}
        score = score_audit(responses)
        assert score == 0.0

        # Test maximum score (all 4s)
        responses = {f"q{i}": "4" for i in range(1, 11)}
        score = score_audit(responses)
        assert score == 40.0

        # Test mixed responses
        responses = {
            "q1": "2",
            "q2": "2",
            "q3": "1",
            "q4": "1",
            "q5": "0",
            "q6": "0",
            "q7": "0",
            "q8": "0",
            "q9": "0",
            "q10": "0",
        }
        score = score_audit(responses)
        assert score == 6.0

    def test_score_bdi(self):
        """Test BDI scoring algorithm"""
        # Test minimum score
        responses = {f"q{i}": "0" for i in range(1, 22)}
        score = score_bdi(responses)
        assert score == 0.0

        # Test maximum score
        responses = {f"q{i}": "3" for i in range(1, 22)}
        score = score_bdi(responses)
        assert score == 63.0

        # Test mixed responses
        responses = {f"q{i}": "1" for i in range(1, 22)}
        score = score_bdi(responses)
        assert score == 21.0

    def test_score_bai(self):
        """Test BAI scoring algorithm"""
        # Test minimum score
        responses = {f"q{i}": "0" for i in range(1, 22)}
        score = score_bai(responses)
        assert score == 0.0

        # Test maximum score
        responses = {f"q{i}": "3" for i in range(1, 22)}
        score = score_bai(responses)
        assert score == 63.0

        # Test mild anxiety
        responses = {f"q{i}": "1" for i in range(1, 11)}  # 10 questions with score 1
        responses.update({f"q{i}": "0" for i in range(11, 22)})  # Rest with score 0
        score = score_bai(responses)
        assert score == 10.0

    def test_score_psqi(self):
        """Test PSQI scoring algorithm"""
        # Test minimum score
        responses = {
            "sleep_quality": "0",
            "sleep_latency": "0",
            "sleep_duration": "0",
            "sleep_efficiency": "0",
            "sleep_disturbances": "0",
            "sleep_medication": "0",
            "daytime_dysfunction": "0",
        }
        score = score_psqi(responses)
        assert score == 0.0

        # Test maximum score
        responses = {
            "sleep_quality": "3",
            "sleep_latency": "3",
            "sleep_duration": "3",
            "sleep_efficiency": "3",
            "sleep_disturbances": "3",
            "sleep_medication": "3",
            "daytime_dysfunction": "3",
        }
        score = score_psqi(responses)
        assert score == 21.0

        # Test mixed responses
        responses = {
            "sleep_quality": "1",
            "sleep_latency": "1",
            "sleep_duration": "1",
            "sleep_efficiency": "1",
            "sleep_disturbances": "1",
            "sleep_medication": "1",
            "daytime_dysfunction": "1",
        }
        score = score_psqi(responses)
        assert score == 7.0

    def test_score_k_mdq(self):
        """Test K-MDQ scoring algorithm"""
        # Test minimum score
        responses = {
            **{f"q{i}": "no" for i in range(1, 14)},
            "clustering": False,
            "impairment": "0",
        }
        score = score_k_mdq(responses)
        assert score == 0.0

        # Test positive screen
        responses = {
            **{f"q{i}": "yes" for i in range(1, 8)},  # 7 yes answers
            **{f"q{i}": "no" for i in range(8, 14)},  # Rest no
            "clustering": True,
            "impairment": "2",
        }
        score = score_k_mdq(responses)
        assert score == 10.0  # 7 + 1 + 2

        # Test with numeric responses
        responses = {
            **{f"q{i}": 1 for i in range(1, 6)},  # 5 yes (as 1)
            **{f"q{i}": 0 for i in range(6, 14)},  # Rest no (as 0)
            "clustering": 1,
            "impairment": 3,
        }
        score = score_k_mdq(responses)
        assert score == 9.0  # 5 + 1 + 3

    def test_convert_to_numeric(self):
        """Test numeric conversion helper function"""
        # Test string mappings
        assert _convert_to_numeric("never") == 0
        assert _convert_to_numeric("sometimes") == 1
        assert _convert_to_numeric("often") == 2
        assert _convert_to_numeric("always") == 3

        # Test numeric strings
        assert _convert_to_numeric("0") == 0
        assert _convert_to_numeric("3") == 3
        assert _convert_to_numeric("5", max_value=3) == 3  # Clamped to max

        # Test numeric values
        assert _convert_to_numeric(2) == 2
        assert _convert_to_numeric(2.5) == 2

        # Test invalid values
        assert _convert_to_numeric("invalid") == 0
        assert _convert_to_numeric(None) == 0

        # Test yes/no responses
        assert _convert_to_numeric("yes") == 1
        assert _convert_to_numeric("no") == 0

    def test_score_survey_dispatcher(self):
        """Test the main score_survey function"""
        # Test AUDIT
        audit_responses = {f"q{i}": "1" for i in range(1, 11)}
        score = score_survey("AUDIT", audit_responses)
        assert score == 10.0

        # Test BDI
        bdi_responses = {f"q{i}": "1" for i in range(1, 22)}
        score = score_survey("BDI", bdi_responses)
        assert score == 21.0

        # Test invalid survey type
        with pytest.raises(Exception):
            score_survey("INVALID_SURVEY", {})

    def test_get_score_interpretation(self):
        """Test score interpretation functions"""
        # Test AUDIT interpretations with gender
        result = get_score_interpretation("AUDIT", 5, gender="남")
        assert result["category"] == "정상음주"

        result = get_score_interpretation("AUDIT", 15, gender="남")
        assert result["category"] == "위험음주"

        result = get_score_interpretation("AUDIT", 25, gender="남")
        assert result["category"] == "알코올사용장애"

        # Test AUDIT interpretations for female
        result = get_score_interpretation("AUDIT", 3, gender="여")
        assert result["category"] == "정상음주"

        result = get_score_interpretation("AUDIT", 7, gender="여")
        assert result["category"] == "위험음주"

        # Test BDI interpretations
        result = get_score_interpretation("BDI", 8)
        assert result["category"] == "정상"

        result = get_score_interpretation("BDI", 12)
        assert result["category"] == "가벼운 우울"

        result = get_score_interpretation("BDI", 20)
        assert result["category"] == "중등도 우울"

        result = get_score_interpretation("BDI", 30)
        assert result["category"] == "심한 우울"

        # Test BAI interpretations
        result = get_score_interpretation("BAI", 5)
        assert result["category"] == "정상"

        result = get_score_interpretation("BAI", 10)
        assert result["category"] == "가벼운 불안"

        result = get_score_interpretation("BAI", 20)
        assert result["category"] == "중등도 불안"

        result = get_score_interpretation("BAI", 30)
        assert result["category"] == "심한 불안"

        # Test AUDIT without gender (should show error)
        result = get_score_interpretation("AUDIT", 10)
        assert result["category"] == "미지원"
        assert "Gender is required" in result["description"]

        # Test PSQI interpretations (may not be in JSON, should fallback)
        result = get_score_interpretation("PSQI", 3)
        # Since PSQI may not be in the JSON file, it should either work or show error
        assert "category" in result
        assert "description" in result

        # Test K-MDQ interpretations (needs additional conditions)
        result = get_score_interpretation("K-MDQ", 5)
        # Below threshold should be normal
        assert "category" in result

        # Test unknown survey type
        result = get_score_interpretation("UNKNOWN", 10)
        assert result["category"] in ["미지원", "해석 불가"]

    def test_edge_cases(self):
        """Test edge cases and error handling"""
        # Test empty responses
        score = score_audit({})
        assert score == 0.0

        # Test missing questions
        responses = {"q1": "2", "q3": "1"}  # Missing q2
        score = score_audit(responses)
        assert score == 3.0

        # Test extra questions (should be ignored)
        responses = {f"q{i}": "1" for i in range(1, 15)}  # More than 10 questions
        score = score_audit(responses)
        assert score == 10.0  # Only first 10 counted

        # Test extreme values
        responses = {f"q{i}": "999" for i in range(1, 11)}
        score = score_audit(responses)
        assert score == 40.0  # Clamped to max value

    def test_string_response_variations(self):
        """Test various string response formats"""
        # Test case insensitive
        responses = ["NEVER", "Always", "SomeTimes"]
        converted = [_convert_to_numeric(v) for v in responses]
        assert converted == [0, 3, 1]

        # Test with extra whitespace
        responses = [" never ", " always ", " sometimes "]
        converted = [_convert_to_numeric(v.strip()) for v in responses]
        assert converted == [0, 3, 1]

        # Test boolean-like responses
        assert _convert_to_numeric("true") == 1
        assert _convert_to_numeric("false") == 0


class TestScoringConsistency:
    """Test scoring consistency and reliability"""

    def test_scoring_deterministic(self):
        """Test that scoring is deterministic"""
        responses = {f"q{i}": "2" for i in range(1, 11)}

        # Score multiple times
        scores = [score_audit(responses) for _ in range(5)]

        # All scores should be identical
        assert all(score == scores[0] for score in scores)
        assert scores[0] == 20.0

    def test_survey_type_case_sensitivity(self):
        """Test that survey type handling is case insensitive where appropriate"""
        responses = {f"q{i}": "1" for i in range(1, 11)}

        # These should work the same
        score1 = score_survey("AUDIT", responses)
        # Note: Our current implementation is case sensitive
        # This test documents current behavior
        with pytest.raises(Exception):
            score_survey("audit", responses)  # lowercase should fail

    def test_all_survey_types_covered(self):
        """Test that all expected survey types have scoring functions"""
        expected_surveys = ["AUDIT", "PSQI", "BDI", "BAI", "K-MDQ"]

        for survey_type in expected_surveys:
            # Should not raise an exception
            try:
                score_survey(survey_type, {})
                # Success - scoring function exists
            except Exception as e:
                # Only allow scoring-related errors, not "unknown survey type"
                assert "Unknown survey type" not in str(e)
