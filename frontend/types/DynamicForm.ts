export type QuestionType = "text" | "number" | "radio" | "checkbox" | "date";

export interface Question {
  id: string;
  question: string;
  type: QuestionType;
  required?: boolean;
  options?: string[];
}

export interface QuestionnaireSchema {
  Title: string;
  Description?: string;
  Questions: Question[];
} 