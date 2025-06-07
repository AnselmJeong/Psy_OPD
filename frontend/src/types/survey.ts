// Survey.js 구조와 호환되는 타입 정의
export interface Column {
  value: number;
  text: string;
}

export interface Row {
  value: string;
  text: string;
}

export interface Choice {
  value: string | number;
  text: string;
}

export interface SurveyElement {
  type: string;
  name: string;
  title: string;
  description?: string;
  columns?: Column[];
  rows?: Row[];
  choices?: Choice[];
  inputType?: string;
  min?: number;
  max?: number;
  visibleIf?: string;
  alternateRows?: boolean;
  eachRowRequired?: boolean;
  colCount?: number;
}

export interface SurveyPage {
  name?: string;
  title?: string;
  description?: string;
  elements: SurveyElement[];
}

export interface SurveyStructure {
  pages: SurveyPage[];
}

export interface SurveyResult {
  [key: string]: number | string | { [key: string]: number };
}

// Backend에서 제공되는 완성된 결과 데이터
export interface RatingResult {
  score: number;
  interpretation: string;
  subscores?: { [key: string]: number };
  submission_date?: string;
  patient_id?: string;
  responses: SurveyResult;
}

export interface PatientInfo {
  name?: string;
  id?: string;
  date?: string;
  age?: number;
  gender?: string;
}

// Firebase에서 가져온 환자 데이터 구조
export interface PatientData {
  patientInfo: PatientInfo;
  result: RatingResult; // 변경: surveyResults -> result
  timestamp: string;
  scaleName: string;
}

// Rating scale 설정
export interface RatingScaleConfig {
  name: string;
  maxScore: number;
  ranges: {
    max: number;
    label: string;
    color: string;
  }[];
}

// PSQI 전용 타입
export interface PSQISubscores {
  'Sleep quality': number;
  'Sleep latency': number;
  'Sleep duration': number;
  'Habitual sleep efficiency': number;
  'Sleep disturbance': number;
  'Sleep medication': number;
  'Daytime dysfunction': number;
}

export interface PSQIResult {
  totalScore: number;
  subscores: PSQISubscores;
  interpretation: string;
} 