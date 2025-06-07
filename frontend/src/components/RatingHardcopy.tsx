import React from 'react';
import ReactMarkdown from 'react-markdown';

// TypeScript 인터페이스 정의
interface Column {
  value: number;
  text: string;
}

interface Row {
  value: string;
  text: string;
}

interface Choice {
  value: string | number;
  text: string;
}

interface SurveyElement {
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
}

interface SurveyStructure {
  pages: {
    name?: string;
    title?: string;
    description?: string;
    elements: SurveyElement[];
  }[];
}

interface SurveyResult {
  [key: string]: number | string | { [key: string]: number };
}

// Backend에서 제공되는 완성된 결과 데이터
interface RatingResult {
  score: number;
  interpretation: string;
  subscores?: { [key: string]: number };
  submission_date?: string;
  patient_id?: string;
  responses: SurveyResult;
}

interface RatingHardcopyProps {
  scaleName: string;
  structure: SurveyStructure;
  result: RatingResult; // 변경: results -> result (backend 완성 데이터)
  patientInfo?: {
    name?: string;
    id?: string;
    date?: string;
  };
}

// Rating scale별 기본 정보 (점수 계산은 제거, 표시용 정보만)
const getScaleInfo = (scaleName: string) => {
  const configs: { [key: string]: { name: string; color: string } } = {
    'bai': {
      name: 'Beck Anxiety Inventory',
      color: 'bg-blue-500'
    },
    'bdi': {
      name: 'Beck Depression Inventory',
      color: 'bg-purple-500'
    },
    'phq9': {
      name: 'Patient Health Questionnaire-9',
      color: 'bg-indigo-500'
    },
    'psqi': {
      name: 'Pittsburgh Sleep Quality Index',
      color: 'bg-green-500'
    }
  };

  if (!scaleName) {
    return {
      name: 'Unknown Scale',
      color: 'bg-gray-500'
    };
  }
  
  return configs[scaleName.toLowerCase()] || {
    name: scaleName.toUpperCase(),
    color: 'bg-gray-500'
  };
};



const RatingHardcopy: React.FC<RatingHardcopyProps> = ({ 
  scaleName, 
  structure, 
  result, 
  patientInfo 
}) => {
  const scaleInfo = getScaleInfo(scaleName);

  // 응답 렌더링 함수
  const renderResponse = (element: SurveyElement, value: any): React.ReactNode => {
    if (element.type === 'text') {
      if (element.inputType === 'time') {
        return <span className="text-blue-600 font-medium">{value || '미응답'}</span>;
      } else if (element.inputType === 'number') {
        return <span className="text-blue-600 font-medium">{value ? `${value}시간` : '미응답'}</span>;
      }
      return <span className="text-blue-600 font-medium">{value || '미응답'}</span>;
    }
    
    if (element.type === 'radiogroup') {
      const choice = element.choices?.find(c => c.value == value);
      return (
        <span className="inline-flex items-center space-x-2">
          <span className="text-sm">{choice?.text || '미응답'}</span>
          {choice && (
            <span className="text-blue-600 text-xs font-medium">
              ({choice.value})
            </span>
          )}
        </span>
      );
    }
    
    if (element.type === 'matrix') {
      const matrixValue = value as { [key: string]: number };
      if (!matrixValue) return <span className="text-red-500">미응답</span>;
      
      return (
        <div className="space-y-1">
          {element.rows?.map(row => {
            const rowValue = matrixValue[row.value];
            const column = element.columns?.find(col => col.value === rowValue);
            return (
              <div key={row.value} className="text-xs">
                <span className="font-mono text-gray-500">{row.value}:</span> 
                <span className="ml-2">{column?.text || '미응답'}</span>
                {rowValue !== undefined && (
                  <span className="ml-1 text-blue-600 text-xs font-medium">({rowValue})</span>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    
    return <span className="text-gray-500">알 수 없는 타입</span>;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-6xl mx-auto">
      {/* 헤더 */}
      <div className="border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{scaleInfo.name} 결과</h1>
        {patientInfo && (
          <div className="text-sm text-gray-600 mt-2 space-y-1">
            {patientInfo.name && <p><span className="font-medium">환자명:</span> {patientInfo.name}</p>}
            {patientInfo.id && <p><span className="font-medium">환자 ID:</span> {patientInfo.id}</p>}
            {result.submission_date && (
              <p>
                <span className="font-medium">검사일:</span> {
                  new Date(result.submission_date).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  })
                }
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* 요약 섹션 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Summary</h2>
          <div className="space-y-4">
            <p><span className="font-medium">Total Score:</span> {result.score}</p>
            <div>
              <span className="font-medium">Interpretation:</span>
              <div className="mt-2 prose prose-sm max-w-none">
                <ReactMarkdown>{result.interpretation}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>

        {/* Subscores 섹션 */}
        {result.subscores && Object.keys(result.subscores).length > 0 && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-3 text-gray-700">Subscores</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(result.subscores).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div className="text-sm text-gray-600">{key}</div>
                  <div className="text-xl font-bold text-blue-600">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 상세 응답 섹션 */}
        <div>
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Detailed Responses</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-3 text-left font-medium text-gray-700">Question</th>
                  <th className="border border-gray-300 p-3 text-left font-medium text-gray-700">Response</th>
                </tr>
              </thead>
              <tbody>
                {structure.pages.map((page, pageIndex) => 
                  page.elements.map((element, elementIndex) => {
                    const value = result.responses[element.name];
                    
                    return (
                      <tr 
                        key={`${pageIndex}-${elementIndex}`}
                        className={`${(pageIndex + elementIndex) % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition-colors`}
                      >
                        <td className="border border-gray-300 p-3">
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{element.title}</div>
                            {element.description && (
                              <div className="text-xs text-gray-500">{element.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="border border-gray-300 p-3">
                          {renderResponse(element, value)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>


      </div>
    </div>
  );
};

export default RatingHardcopy;
