"use client";
import "survey-core/survey-core.css";
import { useCallback, useEffect } from "react";
import markdownit from "markdown-it";


/*
  Don't forget to import or reference the `survey-core.css` style sheet
  as described in the Get Started with SurveyJS article for your framework
*/
import { LayeredLight }  from "survey-core/themes";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";

const URL = "http://localhost:3000/api/survey/";

export default function RatingPage({schema, onComplete, scale}: {schema: object, onComplete?: (data: any) => void, scale: string}) {
  const survey = new Model(schema);
  survey.applyTheme(LayeredLight);
  // const surveyComplete = useCallback((survey: Model) => {
  //   const userId = "1234567890";
  //   survey.setValue("userId", userId);

  //   saveSurveyResults(
  //     URL + userId,
  //     survey.data
  //   );
  // }, []);

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

  useEffect(() => {
    const handleComplete = (survey: Model) => {
      const results = survey.data;
      // 항상 파일 다운로드
      downloadJSON(results, `user_data_${scale}.json`);
      if (onComplete) {
        onComplete(results);
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