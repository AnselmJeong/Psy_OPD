"""
LLM integration for generating patient summaries
"""

from app.config.settings import settings
from app.services.firebase import firebase_service

import httpx
from typing import Dict, Any
from datetime import datetime, timedelta
import json

# Cache for storing generated summaries
_summary_cache = {}
_CACHE_EXPIRY = timedelta(hours=24)  # Cache expires after 24 hours


MODEL = settings.MODEL
API_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
)


def call_llm_with_retry(payload, headers, max_retries=1):
    for attempt in range(max_retries + 1):
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(API_URL, json=payload, headers=headers)
                print(
                    f"[DEBUG] Response status: {response.status_code} (attempt {attempt + 1})"
                )
                if response.status_code != 200:
                    print(f"[DEBUG] API Error: {response.text}")
                    continue
                response_data = response.json()
                print(f"[DEBUG] Response data keys: {response_data.keys()}")
                print(f"[DEBUG] Response data: {response.text}")
                if "candidates" in response_data and response_data["candidates"]:
                    candidate = response_data["candidates"][0]
                    if "content" in candidate and "parts" in candidate["content"]:
                        if candidate["content"]["parts"]:
                            text_response = candidate["content"]["parts"][0].get(
                                "text", ""
                            )
                            if text_response.strip():
                                print(
                                    f"[DEBUG] LLM response length: {len(text_response)}"
                                )
                                return text_response
                print("[DEBUG] No valid content in response (retrying if possible)")
        except Exception as e:
            print(f"[DEBUG] LLM 호출 실패 (attempt {attempt + 1}): {e}")
    return None


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
    당신은 정신건강 전문의입니다. 환자의 {scale_name} 평가 결과를 바탕으로 보고서를 작성해주세요.

    ## 점수 결과:
    - 총점: {score_interpretation.get("total_score", "N/A")}점
    - 세부 점수:
    {subscores_text}
    - 원점수:
    {rating_result_text}
    
    ## 해석:
    {score_interpretation.get("interpretation", "N/A")}
    
    보고서는 일반인이 읽기에 적합한 톤으로 작성하되, 명확하고 이해하기 쉽게 작성해주세요.
    다음 형식으로 마크다운 보고서를 작성해주세요. 마크다운 문법을 엄격히 준수하고, 각 헤더와 목록 사이에 반드시 줄바꿈(\n\n)을 포함해야 합니다. 
    출력은 이스케이프 문자나 추가 텍스트 없이 보고서만 출력하세요. 
    줄바꿈과 공백이 렌더링 환경에서 유지되도록 정확히 작성하세요.
    권고 사항은 포함하지 마세요.
    
    FORMAT:

    ### 평가 개요

    - 사용된 평가도구와 목적에 대한 설명

    
    ### 점수 결과
    
    - 총점 및 만약 subscores가 있다면 subscores의 의미와 해석
    - (원점수는 열거하지 마세요.)

    
    ### 임상적 의미
    
    - 현재 상태에 대한 전문적 분석
    - 주요 관심 영역 식별

    """

    # Prepare request payload
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 8192,
        },
    }

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": settings.GOOGLE_API_KEY,
    }

    try:
        print(f"[DEBUG] Making request to {API_URL}")
        text_response = call_llm_with_retry(payload, headers, max_retries=1)
        if text_response:
            return (
                text_response
                + "\n\n\n\n주의: 이 보고서는 자동 생성된 보고서입니다. 보다 자세한 분석을 위해서는 전문의와 상담하시기 바랍니다."
            )
        print("[DEBUG] No valid content in response after retry")
        return generate_fallback_report(scale_name, score_interpretation)
    except Exception as e:
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

### 점수 결과
- **총점**: {score_interpretation.get("total_score", "N/A")}점
{subscores_section}

### 해석
{score_interpretation.get("interpretation", "해석 정보가 없습니다.")}

### 주의사항
이 보고서는 자동 생성된 기본 보고서입니다. 보다 자세한 분석을 위해서는 전문의와 상담하시기 바랍니다.
"""


def generate_total_summary(
    scale_summaries: Dict[str, Dict[str, Any]], patient_id: str
) -> str:
    """
    Generate a comprehensive total summary of all scale results using LLM
    and save it to Firestore under surveys/{patient_id}/required/total_summary
    """
    # Check cache first
    cache_key = hash(json.dumps(scale_summaries, sort_keys=True))
    if cache_key in _summary_cache:
        cached_data = _summary_cache[cache_key]
        if datetime.now() - cached_data["timestamp"] < _CACHE_EXPIRY:
            return cached_data["summary"]

    if not settings.GOOGLE_API_KEY:
        print("[DEBUG] GOOGLE_API_KEY is not set")
        return generate_fallback_total_summary(scale_summaries)

    # Use REST API directly for more reliable results

    # Build detailed prompt with all available data
    scales_text = ""
    for scale_name, data in scale_summaries.items():
        scales_text += f"\n### {scale_name}:\n"
        scales_text += f"- 점수: {data.get('score', 'N/A')}\n"
        scales_text += f"- 요약:\n{data.get('summary', 'N/A')}\n"

    prompt = f"""
    당신은 정신건강의학과 전문의입니다. 환자의 여러 평가 척도 결과를 종합적으로 분석하여 전체적인 상태를 평가해주세요.

    ## 각 척도별 평가 결과:
    {scales_text}

    
    다음 형식으로 마크다운 보고서를 작성해주세요.
    마크다운 문법을 엄격히 준수하고, 각 헤더와 목록 사이에 반드시 줄바꿈(\n\n)을 포함해야 합니다. 
    출력은 이스케이프 문자나 추가 텍스트 없이 보고서만 출력하세요. 
    줄바꿈과 공백이 렌더링 환경에서 유지되도록 정확히 작성하세요.
    권고 사항은 포함하지 마세요.
    
    FORMAT:
    
    ### 전체 개요

    - 모든 평가 척도의 결과를 종합한 환자의 전반적인 상태

    
    ### 주요 관심 영역

    - 각 척도에서 나타난 주요 문제점이나 주목할 만한 점
    - 척도 간의 연관성 분석

    
    ### 임상적 의미

    - 현재 상태에 대한 전문적 분석
    - 전반적인 심리적/정신적 상태 평가

    """

    # Prepare request payload
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 8192,
        },
    }

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": settings.GOOGLE_API_KEY,
    }

    try:
        print(f"[DEBUG] Making request to {API_URL}")
        text_response = call_llm_with_retry(payload, headers, max_retries=1)
        if text_response:
            # Cache the successful response
            _summary_cache[cache_key] = {
                "summary": text_response,
                "timestamp": datetime.now(),
            }
            # Save to Firestore
            try:
                import asyncio

                coro = firebase_service.save_total_summary(patient_id, text_response)
                if asyncio.iscoroutine(coro):
                    asyncio.create_task(coro)
                else:
                    coro
            except Exception as e:
                print(f"[DEBUG] Firestore save failed: {e}")
            return (
                text_response
                + "\n\n주의: 이 보고서는 자동 생성된 보고서입니다. 보다 자세한 분석을 위해서는 전문의와 상담하시기 바랍니다."
            )
        print("[DEBUG] No valid content in response after retry")
        return generate_fallback_total_summary(scale_summaries)
    except Exception as e:
        print(f"[DEBUG] LLM 호출 실패: {e}")
        return generate_fallback_total_summary(scale_summaries)


def generate_fallback_total_summary(scale_summaries: Dict[str, Dict[str, Any]]) -> str:
    """
    Generate a basic fallback total summary when LLM is unavailable
    """
    scales_text = ""
    for scale_name, data in scale_summaries.items():
        scales_text += f"\n### {scale_name}:\n"
        scales_text += f"- 점수: {data.get('score', 'N/A')}\n"
        scales_text += f"- 평가일: {data.get('submission_date', 'N/A')}\n"

    return f"""# 종합 평가 보고서

    ## 평가 결과 요약
    {scales_text}

    ## 주의사항
    이 보고서는 자동 생성된 기본 보고서입니다. 보다 자세한 분석을 위해서는 전문의와 상담하시기 바랍니다.
    """
