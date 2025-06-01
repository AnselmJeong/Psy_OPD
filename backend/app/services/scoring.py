"""
Scoring algorithms for rating scales
"""

from typing import Dict, Any, Union
from fastapi import HTTPException


def score_survey(survey_type: str, responses: Dict[str, Any]) -> float:
    """
    Main scoring function that delegates to specific scoring algorithms

    Args:
        survey_type: Type of survey (e.g., "AUDIT", "PSQI", "BDI", "BAI", "K-MDQ")
        responses: Survey responses from frontend

    Returns:
        float: Calculated score
    """
    scoring_functions = {
        "AUDIT": score_audit,
        "PSQI": score_psqi,
        "BDI": score_bdi,
        "BAI": score_bai,
        "K-MDQ": score_k_mdq,
    }

    if survey_type not in scoring_functions:
        raise HTTPException(
            status_code=400, detail=f"Unknown survey type: {survey_type}"
        )

    try:
        return scoring_functions[survey_type](responses)
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Error scoring {survey_type}: {str(e)}"
        )


def score_audit(responses: Dict[str, Any]) -> float:
    """
    Score AUDIT (Alcohol Use Disorders Identification Test)

    AUDIT scoring:
    - 10 questions, each scored 0-4
    - Total score: 0-40
    - Higher scores indicate higher risk of alcohol-related problems
    """
    total_score = 0
    expected_questions = 10

    # AUDIT questions are typically numbered q1 through q10
    for i in range(1, expected_questions + 1):
        question_key = f"q{i}"
        if question_key in responses:
            # Convert response to numeric value (0-4)
            response_value = _convert_to_numeric(responses[question_key], max_value=4)
            total_score += response_value

    return float(total_score)


def score_psqi(responses: Dict[str, Any]) -> float:
    """
    Score PSQI (Pittsburgh Sleep Quality Index)

    PSQI scoring:
    - 7 component scores, each 0-3
    - Total score: 0-21
    - Higher scores indicate worse sleep quality
    """
    # This is a simplified PSQI scoring
    # Real PSQI requires complex calculations for each component

    # Component 1: Subjective sleep quality
    comp1 = _convert_to_numeric(responses.get("sleep_quality", 0), max_value=3)

    # Component 2: Sleep latency (time to fall asleep)
    comp2 = _convert_to_numeric(responses.get("sleep_latency", 0), max_value=3)

    # Component 3: Sleep duration
    comp3 = _convert_to_numeric(responses.get("sleep_duration", 0), max_value=3)

    # Component 4: Habitual sleep efficiency
    comp4 = _convert_to_numeric(responses.get("sleep_efficiency", 0), max_value=3)

    # Component 5: Sleep disturbances
    comp5 = _convert_to_numeric(responses.get("sleep_disturbances", 0), max_value=3)

    # Component 6: Use of sleeping medication
    comp6 = _convert_to_numeric(responses.get("sleep_medication", 0), max_value=3)

    # Component 7: Daytime dysfunction
    comp7 = _convert_to_numeric(responses.get("daytime_dysfunction", 0), max_value=3)

    total_score = comp1 + comp2 + comp3 + comp4 + comp5 + comp6 + comp7
    return float(total_score)


def score_bdi(responses: Dict[str, Any]) -> float:
    """
    Score BDI (Beck Depression Inventory)

    BDI-II scoring:
    - 21 questions, each scored 0-3
    - Total score: 0-63
    - Higher scores indicate more severe depression
    """
    total_score = 0
    expected_questions = 21

    # BDI questions are typically numbered q1 through q21
    for i in range(1, expected_questions + 1):
        question_key = f"q{i}"
        if question_key in responses:
            response_value = _convert_to_numeric(responses[question_key], max_value=3)
            total_score += response_value

    return float(total_score)


def score_bai(responses: Dict[str, Any]) -> float:
    """
    Score BAI (Beck Anxiety Inventory)

    BAI scoring:
    - 21 questions, each scored 0-3
    - Total score: 0-63
    - Higher scores indicate more severe anxiety
    """
    total_score = 0
    expected_questions = 21

    # BAI questions are typically numbered q1 through q21
    for i in range(1, expected_questions + 1):
        question_key = f"q{i}"
        if question_key in responses:
            response_value = _convert_to_numeric(responses[question_key], max_value=3)
            total_score += response_value

    return float(total_score)


def score_k_mdq(responses: Dict[str, Any]) -> float:
    """
    Score K-MDQ (Korean Mood Disorder Questionnaire)

    K-MDQ scoring:
    - Part 1: 13 yes/no questions (0 or 1 each)
    - Part 2: Clustering of symptoms (yes/no)
    - Part 3: Degree of impairment (0-3)
    - Positive screen requires: Part 1 ≥ 7, Part 2 = yes, Part 3 ≥ 2
    """
    # Part 1: Count "yes" responses (13 questions)
    part1_score = 0
    for i in range(1, 14):
        question_key = f"q{i}"
        if question_key in responses:
            # Convert yes/no to 1/0
            response = responses[question_key]
            if isinstance(response, str):
                part1_score += 1 if response.lower() in ["yes", "y", "1", "true"] else 0
            else:
                part1_score += int(bool(response))

    # Part 2: Clustering (yes/no)
    clustering = responses.get("clustering", False)
    clustering_score = 1 if clustering else 0

    # Part 3: Impairment level (0-3)
    impairment = _convert_to_numeric(responses.get("impairment", 0), max_value=3)

    # For screening purposes, we'll return a composite score
    # Real clinical use would evaluate each part separately
    composite_score = part1_score + clustering_score + impairment

    return float(composite_score)


def _convert_to_numeric(value: Union[str, int, float], max_value: int = 4) -> int:
    """
    Convert survey response to numeric value

    Args:
        value: Response value (could be string, int, or float)
        max_value: Maximum allowed value

    Returns:
        int: Numeric value within range [0, max_value]
    """
    if isinstance(value, str):
        # Handle string responses
        value = value.strip().lower()

        # Map common string responses to numbers
        string_mappings = {
            "never": 0,
            "no": 0,
            "none": 0,
            "not at all": 0,
            "rarely": 1,
            "sometimes": 1,
            "mild": 1,
            "slightly": 1,
            "often": 2,
            "moderate": 2,
            "moderately": 2,
            "always": 3,
            "severe": 3,
            "very": 3,
            "extremely": 3,
            "yes": 1,
            "true": 1,
        }

        if value in string_mappings:
            numeric_value = string_mappings[value]
        else:
            # Try to convert directly to int
            try:
                numeric_value = int(float(value))
            except (ValueError, TypeError):
                numeric_value = 0
    else:
        # Handle numeric responses
        try:
            numeric_value = int(float(value))
        except (ValueError, TypeError):
            numeric_value = 0

    # Ensure value is within valid range
    return max(0, min(numeric_value, max_value))


def get_score_interpretation(survey_type: str, score: float) -> str:
    """
    Get interpretation/category for a given score

    Args:
        survey_type: Type of survey
        score: Calculated score

    Returns:
        str: Score interpretation
    """
    interpretations = {
        "AUDIT": _interpret_audit_score,
        "PSQI": _interpret_psqi_score,
        "BDI": _interpret_bdi_score,
        "BAI": _interpret_bai_score,
        "K-MDQ": _interpret_k_mdq_score,
    }

    if survey_type in interpretations:
        return interpretations[survey_type](score)
    else:
        return f"Score: {score}"


def _interpret_audit_score(score: float) -> str:
    """Interpret AUDIT score"""
    if score <= 7:
        return f"Low risk (Score: {score})"
    elif score <= 15:
        return f"Hazardous drinking (Score: {score})"
    elif score <= 19:
        return f"Harmful drinking (Score: {score})"
    else:
        return f"Alcohol dependence likely (Score: {score})"


def _interpret_psqi_score(score: float) -> str:
    """Interpret PSQI score"""
    if score <= 5:
        return f"Good sleep quality (Score: {score})"
    else:
        return f"Poor sleep quality (Score: {score})"


def _interpret_bdi_score(score: float) -> str:
    """Interpret BDI score"""
    if score <= 13:
        return f"Minimal depression (Score: {score})"
    elif score <= 19:
        return f"Mild depression (Score: {score})"
    elif score <= 28:
        return f"Moderate depression (Score: {score})"
    else:
        return f"Severe depression (Score: {score})"


def _interpret_bai_score(score: float) -> str:
    """Interpret BAI score"""
    if score <= 7:
        return f"Minimal anxiety (Score: {score})"
    elif score <= 15:
        return f"Mild anxiety (Score: {score})"
    elif score <= 25:
        return f"Moderate anxiety (Score: {score})"
    else:
        return f"Severe anxiety (Score: {score})"


def _interpret_k_mdq_score(score: float) -> str:
    """Interpret K-MDQ score"""
    # This is simplified; real K-MDQ interpretation is more complex
    if score >= 10:
        return f"Positive screen for bipolar disorder (Score: {score})"
    else:
        return f"Negative screen (Score: {score})"
