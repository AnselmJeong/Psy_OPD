"""
LLM integration for generating patient summaries
"""

from app.config.settings import settings

import httpx
import json
from typing import Dict, Any


def generate_report(rating_result: dict, scale_name: str, score_interpretation: dict):
    """
    Generate a comprehensive medical report using LLM

    Args:
        scale_name: Name of the assessment scale
        score_interpretation: Scoring results from get_score_interpretation

    Returns:
        Markdown formatted report
    """
    if not settings.GOOGLE_API_KEY:
        print("[DEBUG] GOOGLE_API_KEY is not set")
        return generate_fallback_report(scale_name, score_interpretation)

    # Use REST API directly for more reliable results
    model = "gemini-2.0-flash"  # Use stable model instead of preview
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    # Build detailed prompt with all available data
    subscores_text = ""
    if "subscores" in score_interpretation:
        subscores_text = "\n### 구성요소별 점수:\n"
        for component, score in score_interpretation["subscores"].items():
            subscores_text += f"- {component}: {score}점\n"

    rating_result_text = ""
    for key, value in rating_result.items():
        rating_result_text += f"- {key}: {value}\n"

    prompt = f"""
    당신은 정신건강 전문의입니다. 환자의 {scale_name} 평가 결과를 바탕으로 전문적인 의료 보고서를 작성해주세요.

    ## 점수 결과:
    - 총점: {score_interpretation.get("total_score", "N/A")}점
    - 세부 점수:
    {subscores_text}
    - 원점수:
    {rating_result_text}
    
    ## 해석:
    {score_interpretation.get("interpretation", "N/A")}
    
    보고서는 일반인이 읽기에 적합한 톤으로 작성하되, 명확하고 이해하기 쉽게 작성해주세요.
    다음 내용과 형식으로 마크다운 보고서를 작성하고, 보고서 부분만 출력해주세요. 다른 부분은 출력하지 마세요:

    # {scale_name} 평가 보고서

    ## 1. 평가 개요
    - 사용된 평가도구와 목적에 대한 설명

    ## 2. 점수 결과
    - 총점 및 subscores의 의미와 해석
    - (원점수는 열거하지 마세요.)

    ## 3. 임상적 의미
    - 현재 상태에 대한 전문적 분석
    - 주요 관심 영역 식별

    권고 사항은 포함하지 마세요.
    """

    # Prepare request payload
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 2048,
        },
    }

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": settings.GOOGLE_API_KEY,
    }

    try:
        print(f"[DEBUG] Making request to {api_url}")

        with httpx.Client(timeout=30.0) as client:
            response = client.post(api_url, json=payload, headers=headers)

            print(f"[DEBUG] Response status: {response.status_code}")

            if response.status_code != 200:
                print(f"[DEBUG] API Error: {response.text}")
                return generate_fallback_report(scale_name, score_interpretation)

            response_data = response.json()
            print(f"[DEBUG] Response data keys: {response_data.keys()}")

            if "candidates" in response_data and response_data["candidates"]:
                candidate = response_data["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"]:
                    if candidate["content"]["parts"]:
                        text_response = candidate["content"]["parts"][0].get("text", "")
                        print(f"[DEBUG] LLM response length: {len(text_response)}")

                        return (
                            text_response
                            + "\n\n주의: 이 보고서는 자동 생성된 보고서입니다. 보다 자세한 분석을 위해서는 전문의와 상담하시기 바랍니다."
                        )

            print("[DEBUG] No valid content in response")
            return generate_fallback_report(scale_name, score_interpretation)

    except Exception as e:
        # LLM 호출 실패 시 기본 보고서 반환
        print(f"[DEBUG] LLM 호출 실패: {e}")
        return generate_fallback_report(scale_name, score_interpretation)


def generate_fallback_report(scale_name: str, score_interpretation: dict) -> str:
    """
    Generate a basic fallback report when LLM is unavailable
    """
    subscores_section = ""
    if "subscores" in score_interpretation:
        subscores_section = "\n### 구성요소별 점수\n"
        for component, score in score_interpretation["subscores"].items():
            subscores_section += f"- {component}: {score}점\n"

    return f"""# {scale_name} 평가 보고서

## 점수 결과
- **총점**: {score_interpretation.get("total_score", "N/A")}점
{subscores_section}

## 해석
{score_interpretation.get("interpretation", "해석 정보가 없습니다.")}

## 주의사항
이 보고서는 자동 생성된 기본 보고서입니다. 보다 자세한 분석을 위해서는 전문의와 상담하시기 바랍니다.
"""
