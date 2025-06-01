"""
LLM integration for generating patient summaries
"""

import httpx
from typing import Dict, Any, Optional
from fastapi import HTTPException

from app.config.settings import settings
from app.services.scoring import get_score_interpretation


class LLMService:
    """Service for LLM integration to generate patient summaries"""

    def __init__(self):
        self.api_key = settings.LLM_API_KEY
        self.base_url = settings.LLM_API_BASE_URL

    async def generate_summary(
        self, survey_type: str, responses: Dict[str, Any], score: float
    ) -> str:
        """
        Generate a comprehensive summary using LLM

        Args:
            survey_type: Type of survey (e.g., "AUDIT", "BDI")
            responses: Survey responses
            score: Calculated score

        Returns:
            str: LLM-generated summary
        """
        if not self.api_key:
            # Fallback to template-based summary if no LLM API key
            return self._generate_template_summary(survey_type, responses, score)

        try:
            # Prepare prompt for LLM
            prompt = self._create_prompt(survey_type, responses, score)

            # Call LLM API
            summary = await self._call_llm_api(prompt)

            return summary

        except Exception as e:
            # Fallback to template-based summary on error
            print(f"LLM API error: {e}")
            return self._generate_template_summary(survey_type, responses, score)

    def _create_prompt(
        self, survey_type: str, responses: Dict[str, Any], score: float
    ) -> str:
        """Create a prompt for the LLM based on survey data"""

        # Get score interpretation
        interpretation = get_score_interpretation(survey_type, score)

        # Create context-specific prompts
        survey_contexts = {
            "AUDIT": "alcohol use patterns and related risks",
            "PSQI": "sleep quality and sleep-related issues",
            "BDI": "depressive symptoms and mood patterns",
            "BAI": "anxiety symptoms and anxiety-related concerns",
            "K-MDQ": "mood disorder screening and bipolar symptoms",
        }

        context = survey_contexts.get(survey_type, "mental health assessment")

        prompt = f"""
You are a healthcare professional assistant. Based on the following {survey_type} assessment results, 
provide a comprehensive, empathetic, and professional summary for the patient.

Assessment Type: {survey_type}
Score: {score}
Interpretation: {interpretation}
Context: {context}

Survey Responses: {responses}

Please provide a summary that:
1. Explains the assessment results in patient-friendly language
2. Highlights key areas of concern or positive findings
3. Provides general recommendations or next steps
4. Maintains a supportive and non-judgmental tone
5. Emphasizes the importance of discussing results with a healthcare provider

Keep the summary concise but informative (approximately 150-250 words).
Do not provide specific medical diagnoses or treatment recommendations.
"""

        return prompt

    async def _call_llm_api(self, prompt: str) -> str:
        """Call the LLM API to generate summary"""

        # Example using OpenAI-compatible API
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": "gpt-3.5-turbo",  # or appropriate model
            "messages": [
                {
                    "role": "system",
                    "content": "You are a healthcare professional assistant providing patient summaries.",
                },
                {"role": "user", "content": prompt},
            ],
            "max_tokens": 300,
            "temperature": 0.7,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=30.0,
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"LLM API error: {response.text}",
                )

            result = response.json()
            return result["choices"][0]["message"]["content"].strip()

    def _generate_template_summary(
        self, survey_type: str, responses: Dict[str, Any], score: float
    ) -> str:
        """Generate a template-based summary as fallback"""

        interpretation = get_score_interpretation(survey_type, score)

        templates = {
            "AUDIT": self._audit_template,
            "PSQI": self._psqi_template,
            "BDI": self._bdi_template,
            "BAI": self._bai_template,
            "K-MDQ": self._k_mdq_template,
        }

        template_func = templates.get(survey_type, self._default_template)
        return template_func(score, interpretation, responses)

    def _audit_template(
        self, score: float, interpretation: str, responses: Dict[str, Any]
    ) -> str:
        """Template for AUDIT summary"""
        return f"""
AUDIT Assessment Summary

Your AUDIT (Alcohol Use Disorders Identification Test) results show: {interpretation}

This assessment evaluates your alcohol consumption patterns and potential alcohol-related risks. 
Your responses indicate your current relationship with alcohol and help identify areas where 
changes might be beneficial for your health and well-being.

Key Points:
- Total Score: {score}/40
- {interpretation}

Recommendations:
- Discuss these results with your healthcare provider
- Consider your drinking patterns and their impact on your daily life
- If concerns exist, explore resources for support and guidance

Remember, this assessment is a screening tool and should be interpreted by a qualified 
healthcare professional who can provide personalized advice based on your complete 
health picture.
"""

    def _psqi_template(
        self, score: float, interpretation: str, responses: Dict[str, Any]
    ) -> str:
        """Template for PSQI summary"""
        return f"""
PSQI Assessment Summary

Your PSQI (Pittsburgh Sleep Quality Index) results show: {interpretation}

This assessment evaluates your sleep quality over the past month, including factors like 
sleep duration, sleep latency, and daytime functioning related to sleep.

Key Points:
- Total Score: {score}/21
- {interpretation}

Sleep is crucial for physical and mental health. These results can help you and your 
healthcare provider understand your sleep patterns and identify potential areas for improvement.

Recommendations:
- Share these results with your healthcare provider
- Consider sleep hygiene practices
- Address any underlying factors affecting your sleep

Good sleep quality is essential for overall well-being and can significantly impact 
your daily functioning and health.
"""

    def _bdi_template(
        self, score: float, interpretation: str, responses: Dict[str, Any]
    ) -> str:
        """Template for BDI summary"""
        return f"""
BDI Assessment Summary

Your BDI (Beck Depression Inventory) results show: {interpretation}

This assessment evaluates symptoms that may be associated with depression, including mood, 
outlook, and various emotional and physical symptoms.

Key Points:
- Total Score: {score}/63
- {interpretation}

It's important to remember that this is a screening tool, and these results should be 
discussed with a qualified mental health professional for proper evaluation and support.

Recommendations:
- Discuss these results with your healthcare provider or mental health professional
- Consider professional support if you're experiencing persistent difficulties
- Remember that effective treatments are available

Your mental health is important, and seeking professional guidance is a positive step 
toward understanding and addressing any concerns.
"""

    def _bai_template(
        self, score: float, interpretation: str, responses: Dict[str, Any]
    ) -> str:
        """Template for BAI summary"""
        return f"""
BAI Assessment Summary

Your BAI (Beck Anxiety Inventory) results show: {interpretation}

This assessment evaluates physical and cognitive symptoms associated with anxiety, 
helping to understand your experience with anxiety-related symptoms.

Key Points:
- Total Score: {score}/63
- {interpretation}

Anxiety symptoms can significantly impact daily functioning, but effective treatments 
and coping strategies are available.

Recommendations:
- Share these results with your healthcare provider
- Consider discussing anxiety management strategies
- Explore professional support if symptoms interfere with daily activities

Understanding your anxiety symptoms is the first step toward finding effective ways 
to manage them and improve your quality of life.
"""

    def _k_mdq_template(
        self, score: float, interpretation: str, responses: Dict[str, Any]
    ) -> str:
        """Template for K-MDQ summary"""
        return f"""
K-MDQ Assessment Summary

Your K-MDQ (Korean Mood Disorder Questionnaire) results show: {interpretation}

This screening tool evaluates symptoms that may be associated with mood disorders, 
particularly patterns that might suggest bipolar disorder.

Key Points:
- Assessment Score: {score}
- {interpretation}

This is a screening tool designed to identify potential mood-related concerns that 
warrant further professional evaluation.

Recommendations:
- Discuss these results with a mental health professional
- Consider a comprehensive evaluation if screening suggests potential concerns
- Remember that proper diagnosis requires professional assessment

Mood disorders are treatable conditions, and early identification and intervention 
can significantly improve outcomes and quality of life.
"""

    def _default_template(
        self, score: float, interpretation: str, responses: Dict[str, Any]
    ) -> str:
        """Default template for unknown survey types"""
        return f"""
Assessment Summary

Your assessment results show a score of {score}.

Interpretation: {interpretation}

This assessment provides valuable information about your current status in the evaluated area. 
These results can help you and your healthcare provider better understand your situation 
and determine appropriate next steps.

Recommendations:
- Discuss these results with your healthcare provider
- Consider any recommendations provided by your clinical team
- Use this information as part of your overall health and wellness planning

Remember that assessment tools are most valuable when interpreted by qualified 
healthcare professionals who can consider your complete health picture.
"""


# Global instance
llm_service = LLMService()
