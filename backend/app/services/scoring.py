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
    rating_result: dict, scale_name: str, gender: str | None, generate_llm_report: bool = True
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
    total_score = sum(int(value) for value in rating_result.values())

    # 해당 도구의 채점 기준 찾기
    tool = next((t for t in diagnostic_criteria["diagnosticTools"] if t["name"] == scale_name), None)
    if not tool:
        return {"error": f"지원되지 않는 도구: {scale_name}"}

    # 성별에 따른 채점 기준 선택
    category = None
    if "categories" in tool:
        if not gender:
            return {"error": "성별이 필요한 도구입니다."}
        category = next((c for c in tool["categories"] if c["sex"] == gender), None)
        if not category:
            return {"error": f"성별 {gender}에 대한 채점 기준이 없습니다."}

    scoring_rules = category["scoring"] if category else tool["scoring"]

    # 총점에 따른 해석 찾기
    interpretation = None
    for rule in scoring_rules:
        if rule["range"][0] <= total_score <= rule["range"][1]:
            interpretation = rule["interpretation"]
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
    scale_name = "AUDIT-K"
    gender = "남성"
    result = get_score_interpretation(rating_result, scale_name, gender, generate_llm_report=True)
    print(result)
