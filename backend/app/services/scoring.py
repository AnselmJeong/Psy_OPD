import json

# 모듈 import 처리
try:
    # 패키지 내에서 import 시 (상대 import)
    from .psqi_scoring import calculate_psqi_score, evaluate_psqi
    from .llm import generate_report
except ImportError:
    # 직접 실행 시 (절대 import)
    import sys
    import os

    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    from app.services.psqi_scoring import calculate_psqi_score, evaluate_psqi
    from app.services.llm import generate_report

import os

# JSON 파일 경로 설정
current_dir = os.path.dirname(os.path.abspath(__file__))
json_file_path = os.path.join(current_dir, "..", "references", "scoring_criteria.json")

with open(json_file_path, "r", encoding="utf-8") as f:
    diagnostic_criteria = json.load(f)


def get_score_interpretation(
    rating_result: dict,
    scale_name: str,
    gender: str | None,
    generate_llm_report: bool = True,
):
    # PSQI의 경우 특별 처리
    if scale_name == "PSQI":
        psqi_result = calculate_psqi_score(rating_result)
        interpretation = evaluate_psqi(psqi_result["total_score"])

        result = {
            "tool_name": scale_name,
            "total_score": psqi_result["total_score"],
            "subscores": psqi_result["subscores"],
            "interpretation": interpretation,
        }

        # LLM 리포트 생성
        if generate_llm_report:
            result["llm_report"] = generate_report(rating_result, scale_name, result)

        return result

    # 일반적인 도구들의 채점 기준 JSON 처리
    # 총점 계산
    def _numeric_sum(obj):
        """Recursively accumulate numeric values in dicts/lists/values"""
        total = 0
        if isinstance(obj, dict):
            for v in obj.values():
                total += _numeric_sum(v)
        elif isinstance(obj, list):
            for item in obj:
                total += _numeric_sum(item)
        else:
            try:
                total += int(obj)
            except (ValueError, TypeError):
                # Non-numeric value, ignore
                pass
        return total

    total_score = _numeric_sum(rating_result)

    # 해당 도구의 채점 기준 찾기
    print(f"[DEBUG] Looking for scale_name: '{scale_name}' in scoring criteria")
    print(
        f"[DEBUG] Available tools in criteria: {[t['name'] for t in diagnostic_criteria['assessments']]}"
    )

    tool = next(
        (t for t in diagnostic_criteria["assessments"] if t["name"] == scale_name), None
    )
    if not tool:
        return {"error": f"지원되지 않는 도구: {scale_name}"}

    # 성별에 따른 채점 기준 선택
    category = None
    if "criteria_by_gender" in tool:
        print(f"[DEBUG] Gender-based criteria found for {scale_name}")
        print(f"[DEBUG] Passed gender: '{gender}'")
        print(
            f"[DEBUG] Available gender keys: {list(tool.get('criteria_by_gender', {}).keys())}"
        )

        if not gender:
            return {"error": "성별이 필요한 도구입니다."}
        category = tool.get("criteria_by_gender", {}).get(gender)
        if not category:
            return {"error": f"성별 {gender}에 대한 채점 기준이 없습니다."}
    else:
        print(
            f"[DEBUG] No gender-based criteria for {scale_name}, using general criteria"
        )

    scoring_rules = category if category else tool.get("criteria", [])

    # 총점에 따른 해석 찾기
    interpretation = None
    for rule in scoring_rules:
        if rule.get("range"):
            # Handle cases where upper bound might be None/null (represents infinity)
            min_score = rule["range"][0]
            max_score = rule["range"][1]

            if max_score is None:
                # No upper limit
                if total_score >= min_score:
                    interpretation = rule["category"] + " - " + rule["description"]
                    break
            else:
                # Normal range check
                if min_score <= total_score <= max_score:
                    interpretation = rule["category"] + " - " + rule["description"]
                    break
        elif rule.get("threshold") and total_score >= rule["threshold"]:
            interpretation = rule["category"] + " - " + rule["description"]
            if rule.get("additional_condition"):
                condition = rule["additional_condition"]
                field_name = condition["field"]
                expected_value = condition["value"]
                actual_value = rating_result.get(field_name)

                # Debug information
                print(f"[DEBUG] Additional condition check for {scale_name}:")
                print(f"  Field: {field_name}")
                print(f"  Expected: {expected_value} (type: {type(expected_value)})")
                print(f"  Actual: {actual_value} (type: {type(actual_value)})")

                # Robust comparison for boolean values
                condition_met = False
                if isinstance(expected_value, bool):
                    # Handle various truthy/falsy representations including JSON strings
                    if expected_value:  # Expected True
                        condition_met = actual_value in [
                            True,
                            "true",
                            "True",
                            1,
                            "1",
                        ] or (
                            isinstance(actual_value, str)
                            and actual_value.lower() == "true"
                        )
                    else:  # Expected False
                        condition_met = actual_value in [
                            False,
                            "false",
                            "False",
                            0,
                            "0",
                            None,
                            "",
                        ] or (
                            isinstance(actual_value, str)
                            and actual_value.lower() == "false"
                        )
                else:
                    # For non-boolean values, use direct comparison
                    condition_met = actual_value == expected_value

                print(f"  Condition met: {condition_met}")

                if not condition_met:
                    interpretation = "조건 미충족 - " + condition["description"]
            break

    if interpretation is None:
        interpretation = "점수 범위를 확인할 수 없습니다."

    result = {
        "tool_name": scale_name,
        "total_score": total_score,
        "interpretation": interpretation,
    }

    # LLM 리포트 생성
    if generate_llm_report:
        result["llm_report"] = generate_report(rating_result, scale_name, result)

    return result


# 테스트
if __name__ == "__main__":
    rating_result = {
        "audit-01": 1,
        "audit-02": 0,
        "audit-03": 0,
        "audit-04": 1,
        "audit-05": 0,
        "audit-06": 0,
        "audit-07": 3,
        "audit-08": 0,
        "audit-09": 0,
        "audit-10": 0,
    }
    scale_name = "AUDIT"
    gender = "남"
    result = get_score_interpretation(
        rating_result, scale_name, gender, generate_llm_report=True
    )
    print(result)
