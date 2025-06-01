import json


def interpret_rating_scale(
    assessment_name, score, gender=None, additional_conditions=None
):
    """
    Interpret the rating scale result based on the provided JSON criteria.

    Args:
        assessment_name (str): Name of the assessment (e.g., "BDI", "AUDIT").
        score (int): The score to evaluate.
        gender (str, optional): Gender ("남" or "여") for assessments like AUDIT.
        additional_conditions (dict, optional): Additional conditions (e.g., {"simultaneity": "예"}).

    Returns:
        dict: Result containing category and description, or error message.
    """
    # Load the JSON data (assumed to be in a file or string for this example)
    with open("app/reference/scoring_criteria.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    # Find the assessment by name
    assessment = next(
        (a for a in data["assessments"] if a["name"] == assessment_name), None
    )
    if not assessment:
        return {"error": f"Assessment '{assessment_name}' not found."}

    # Initialize result
    result = {"category": None, "description": None}

    # Check if the assessment uses gender-based criteria (e.g., AUDIT)
    if "criteria_by_gender" in assessment:
        if not gender:
            return {"error": "Gender is required for this assessment."}
        if gender not in assessment["criteria_by_gender"]:
            return {"error": f"Invalid gender '{gender}'. Expected '남' or '여'."}

        criteria = assessment["criteria_by_gender"][gender]
        for criterion in criteria:
            range_min = criterion["range"][0]
            range_max = (
                criterion["range"][1]
                if criterion["range"][1] is not None
                else float("inf")
            )
            if range_min <= score <= range_max:
                result["category"] = criterion["category"]
                result["description"] = criterion["description"]
                break

    # Check if the assessment uses regular criteria (range or threshold)
    elif "criteria" in assessment:
        for criterion in assessment["criteria"]:
            # Handle range-based criteria
            if "range" in criterion:
                range_min = criterion["range"][0]
                range_max = (
                    criterion["range"][1]
                    if criterion["range"][1] is not None
                    else float("inf")
                )
                if range_min <= score <= range_max:
                    result["category"] = criterion["category"]
                    result["description"] = criterion["description"]
                    break
            # Handle threshold-based criteria (e.g., K-MDQ, OCI-R)
            elif "threshold" in criterion:
                if score >= criterion["threshold"]:
                    # Check additional conditions if present (e.g., K-MDQ's simultaneity)
                    if "additional_condition" in criterion:
                        if not additional_conditions:
                            return {
                                "error": "Additional conditions required for this assessment."
                            }

                        condition_field = criterion["additional_condition"]["field"]
                        expected_value = criterion["additional_condition"]["value"]
                        actual_value = additional_conditions.get(condition_field)

                        if actual_value != expected_value:
                            return {
                                "category": "조건 불충족",
                                "description": f"{condition_field} 값이 '{expected_value}'이어야 하지만 '{actual_value}'입니다.",
                            }

                    result["category"] = criterion["category"]
                    result["description"] = criterion["description"]
                    break

    # If no matching criteria found
    if not result["category"]:
        # For threshold-based assessments, if score is below threshold, assume "normal"
        if "threshold" in assessment["criteria"][0]:
            result["category"] = "정상"
            result["description"] = "점수가 임계값 미만이므로 정상으로 간주됩니다."
        else:
            result["error"] = "No matching criteria found for the given score."

    return result


# Example usage:
if __name__ == "__main__":
    # Example 1: BDI
    result1 = interpret_rating_scale("BDI", 12)
    print("BDI Result:", result1)

    # Example 2: AUDIT (requires gender)
    result2 = interpret_rating_scale("AUDIT", 15, gender="남")
    print("AUDIT Result (남):", result2)

    # Example 3: K-MDQ (requires additional condition)
    result3 = interpret_rating_scale(
        "K-MDQ", 8, additional_conditions={"simultaneity": "예"}
    )
    print("K-MDQ Result:", result3)

    # Example 4: OCI-R
    result4 = interpret_rating_scale("OCI-R", 25)
    print("OCI-R Result:", result4)
