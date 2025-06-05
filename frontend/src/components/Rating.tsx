"use client";
import "survey-core/survey-core.css";
import { useCallback, useEffect } from "react";
import markdownit from "markdown-it";
import { getCurrentUserToken } from "@/lib/firebase";


/*
  Don't forget to import or reference the `survey-core.css` style sheet
  as described in the Get Started with SurveyJS article for your framework
*/
import { LayeredLight }  from "survey-core/themes";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function RatingPage({schema, onComplete, scale}: {schema: object, onComplete?: (data: any) => void, scale: string}) {
  const survey = new Model(schema);
  survey.applyTheme(LayeredLight);

  // Instantiate `markdown-it`
  const converter = markdownit({
    html: true // Support HTML tags in the source (unsafe, see documentation)
  });
  survey.onTextMarkdown.add((_, options) => {
    // Convert Markdown to HTML
    let str = converter.renderInline(options.text);
    // ...
    // Sanitize the HTML markup using a third-party library here
    // ...
    // Set HTML markup to render
    options.html = str;
  });

  const downloadJSON = (data: any, filename: string) => {
    if (typeof window === "undefined") return; // SSR 방지
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    window.URL.revokeObjectURL(url);
  };

  const submitSurveyToBackend = async (responses: any, scale: string) => {
    try {
      // 병록번호를 로컬 스토리지 또는 세션에서 가져오기
      const patientData = JSON.parse(localStorage.getItem('loggedInPatient') || '{}');
      const patientId = patientData.medicalRecordNumber;
      if (!patientId) {
        throw new Error("No patient logged in");
      }

      // 병록번호와 timestamp 포함하여 데이터 준비
      const submissionData = {
        patient_id: patientId,
        survey_type: scale, // backend에서 매핑 처리
        responses: responses,
        timestamp: new Date().toISOString(),
        token: await getCurrentUserToken() || "mock_token_" + patientId // Use Firebase token if available, fallback to mock token
      };

      const response = await fetch(`${API_BASE_URL}/api/v1/survey/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to submit survey');
      }

      const result = await response.json();
      console.log('Survey submitted successfully:', result);
      return result;

    } catch (error) {
      console.error('Error submitting survey:', error);
      // Fallback to download if API fails
      downloadJSON({
        ...responses,
        patient_id: JSON.parse(localStorage.getItem('loggedInPatient') || '{}').medicalRecordNumber || 'unknown',
        timestamp: new Date().toISOString(),
        scale: scale
      }, `user_data_${scale}.json`);
      throw error;
    }
  };

  useEffect(() => {
    const handleComplete = async (survey: Model) => {
      const results = survey.data;
      
      // onComplete를 즉시 호출하여 다음 단계로 진행
      if (onComplete) {
        onComplete(results);
      }
      
      try {
        // Backend로 데이터 전송 시도 (비동기적으로 처리)
        await submitSurveyToBackend(results, scale);
        console.log('Survey data submitted to backend successfully');
      } catch (error) {
        console.error('Failed to submit to backend, using fallback download:', error);
        // Fallback to download if API fails
        downloadJSON({
          ...results,
          patient_id: JSON.parse(localStorage.getItem('loggedInPatient') || '{}').medicalRecordNumber || 'unknown',
          timestamp: new Date().toISOString(),
          scale: scale
        }, `user_data_${scale}.json`);
      }
    };
    
    survey.onComplete.add(handleComplete);
    return () => {
      survey.onComplete.remove(handleComplete);
    };
  }, [survey, onComplete, scale]);

  // survey.onValueChanged.add(saveSurveyResults);

  return (
    <div className="max-w-[900px] w-full mx-auto">
      <Survey model={survey} />
    </div>
  );
}


function saveRatingResults(url: string, json: object) {
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8'
    },
    body: JSON.stringify(json)
  })
  .then(response => {
    if (response.ok) {
      // Handle success
    } else {
      // Handle error
    }
  })
  .catch(error => {
    // Handle error
  });
}