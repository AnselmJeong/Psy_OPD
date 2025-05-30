"use client";

import DynamicForm from "../../components/DynamicForm";
import { DemographicFormSchema } from "../../types/DynamicForm";
import demographicSchema from "../../../questionnaire/demographic.json";

export default function DemographicPage() {
  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <DynamicForm
        schema={demographicSchema as DemographicFormSchema}
        onSubmit={(values) => {
          // 서버로 전송 등
          alert(JSON.stringify(values, null, 2));
        }}
      />
    </div>
  );
} 