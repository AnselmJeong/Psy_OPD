"use client";
import "survey-core/survey-core.css";
import { useCallback } from "react";
import markdownit from "markdown-it";


/*
  Don't forget to import or reference the `survey-core.css` style sheet
  as described in the Get Started with SurveyJS article for your framework
*/
import { LayeredLight }  from "survey-core/themes";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";

const URL = "http://localhost:3000/api/survey/";

export default function RatingPage({schema}: {schema: object}) {
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

  const alertResults = useCallback((survey: Model) => {
    const results = JSON.stringify(survey.data);
    alert(results);
  }, []);

  survey.onComplete.add(alertResults);
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