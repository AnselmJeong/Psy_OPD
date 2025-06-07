import React from 'react';
import RatingHardcopy from '../components/RatingHardcopy';
import { SurveyStructure, RatingResult, PatientInfo } from '../types/survey';

const RatingHardcopyExample: React.FC = () => {
  // Beck Anxiety Inventory (BAI) 구조 예시
  const baiStructure: SurveyStructure = {
    pages: [
      {
        elements: [
          {
            type: "matrix",
            name: "bai-scale",
            title: "Beck Anxiety Inventory",
            columns: [
              { value: 0, text: "전혀 느끼지 않았다" },
              { value: 1, text: "조금 느꼈다" },
              { value: 2, text: "상당히 느꼈다" },
              { value: 3, text: "심하게 느꼈다" }
            ],
            rows: [
              { value: "bai-01", text: "가끔씩 몸이 저리고 쑤시며 감각이 마비된 느낌을 받는다." },
              { value: "bai-02", text: "흥분된 느낌을 받는다." },
              { value: "bai-03", text: "가끔씩 다리가 떨리고 흔들린다." },
              { value: "bai-04", text: "편안하게 쉴 수가 없다." },
              { value: "bai-05", text: "매우 나쁜 일이 일어날 것 같은 두려움을 느낀다." },
              { value: "bai-06", text: "어지러움(현기증)을 느낀다." },
              { value: "bai-07", text: "가끔씩 심장이 두근거리고 빨리 뛴다." },
              { value: "bai-08", text: "침착하지 못한다." },
              { value: "bai-09", text: "자주 겁을 먹고 무서움을 느낀다." },
              { value: "bai-10", text: "신경이 과민 되어 있다." },
              { value: "bai-11", text: "가끔씩 숨이 막히고 질식할 것 같다." },
              { value: "bai-12", text: "자주 손이 떨린다." },
              { value: "bai-13", text: "안절부절못해 한다." },
              { value: "bai-14", text: "미칠 것 같은 두려움을 느낀다." },
              { value: "bai-15", text: "가끔씩 숨쉬기 곤란할 때가 있다." },
              { value: "bai-16", text: "죽을 것 같은 두려움을 느낀다." },
              { value: "bai-17", text: "불안한 상태에 있다." },
              { value: "bai-18", text: "자주 소화가 잘 안되고 뱃속이 불편하다." },
              { value: "bai-19", text: "가끔씩 기절할 것 같다." },
              { value: "bai-20", text: "자주 얼굴이 붉어지고 화가난다." },
              { value: "bai-21", text: "땀을 많이 흘린다.(더위로 인한 경우는 제외)" }
            ]
          }
        ]
      }
    ]
  };

  // Backend에서 제공된 BAI 결과 (완성된 데이터)
  const baiResult: RatingResult = {
    score: 30,
    interpretation: "심한 불안",
    responses: {
      "bai-01": 1,
      "bai-02": 1,
      "bai-03": 2,
      "bai-04": 1,
      "bai-05": 0,
      "bai-06": 1,
      "bai-07": 2,
      "bai-08": 1,
      "bai-09": 2,
      "bai-10": 2,
      "bai-11": 1,
      "bai-12": 2,
      "bai-13": 2,
      "bai-14": 2,
      "bai-15": 1,
      "bai-16": 1,
      "bai-17": 2,
      "bai-18": 2,
      "bai-19": 1,
      "bai-20": 2,
      "bai-21": 1
    }
  };

  // 환자 정보 예시
  const patientInfo: PatientInfo = {
    name: "홍길동",
    id: "P-2024-001",
    date: "2024-01-15",
    age: 35,
    gender: "남성"
  };

  // PSQI 구조 (실제 questionnaire/psqi.json에서 가져온 것)
  const psqiStructure: SurveyStructure = {
    pages: [
      {
        name: "psqi",
        title: "피츠버그 수면 질 평가지 (PSQI)",
        description: "다음 질문들은 지난 한달 간의 평소 수면에 대한 것입니다.",
        elements: [
          {
            type: "text",
            name: "hour_to_goto_sleep",
            title: "지난 한달 동안 보통 언제 잠자리에 드셨습니까",
            description: "잠든 시간이 아니라 잠자리에 들어간 시간을 입력해주세요.",
            inputType: "time"
          },
          {
            type: "radiogroup",
            name: "sleep_onset",
            title: "지난 한달 동안 밤마다 누워서 잠이 들 때까지 보통 얼마만큼의 시간이 걸렸습니까",
            choices: [
              { value: "0", text: "15분 이내" },
              { value: "1", text: "15분 이상 30분 이내" },
              { value: "2", text: "30분 이상 1시간 이내" },
              { value: "3", text: "1시간 이상" }
            ]
          },
          {
            type: "text",
            name: "wakeup_time",
            title: "지난 한달 동안 보통 언제 일어났습니까",
            description: "잠에서 깬 시간이 아니라 잠자리에서 일어난 시간을 입력해주세요.",
            inputType: "time"
          },
          {
            type: "text",
            name: "sleep_duration",
            title: "지난 한달 동안 실제로 몇 시간 주무셨습니까?",
            inputType: "number",
            min: 0,
            max: 24
          },
          {
            type: "matrix",
            name: "psqi_sleep_disturbances",
            title: "지난 한 달 동안 아래와 같은 이유로 잠을 자는 데 얼마나 자주 문제가 있었습니까?",
            columns: [
              { value: 0, text: "지난 한 달간 없었다" },
              { value: 1, text: "주당 1회 이하" },
              { value: 2, text: "주당 1-2회" },
              { value: 3, text: "주당 3회 이상" }
            ],
            rows: [
              { value: "a", text: "30분 이내 잠이 들지 못한다." },
              { value: "b", text: "한 밤 중이나 아침 일찍 깨게 된다." },
              { value: "c", text: "화장실에 가려고 일어나야 한다." },
              { value: "d", text: "숨을 편히 쉬지 못한다." },
              { value: "e", text: "크게 코를 골거나 기침을 한다." },
              { value: "f", text: "오한기운을 심하게 느낀다." },
              { value: "g", text: "열감을 심하게 느낀다." },
              { value: "h", text: "악몽을 꾼다." },
              { value: "i", text: "통증이 있다." },
              { value: "j", text: "기타 다른 이유 때문에 얼마나 잠드는데 문제가 있었습니까?" }
            ]
          },
          {
            type: "radiogroup",
            name: "sleep_quality",
            title: "지난 한 달간, 여러분의 수면의 질을 전반적으로 평가하자면 어떠합니까?",
            choices: [
              { value: 0, text: "아주 좋다" },
              { value: 1, text: "대체로 좋다" },
              { value: 2, text: "대체로 나쁘다" },
              { value: 3, text: "아주 나쁘다" }
            ]
          },
          {
            type: "radiogroup",
            name: "sleep_medication",
            title: "지난 한 달간 잠이 들기 위해 얼마나 자주 약을 복용하셨습니까?",
            description: "처방전을 받았거나 처방전 없이 복용한 경우 모두 포함",
            choices: [
              { value: 0, text: "지난 한 달간 없었다" },
              { value: 1, text: "주 1회 이하" },
              { value: 2, text: "주 1-2회" },
              { value: 3, text: "주 3회 이상" }
            ]
          },
          {
            type: "radiogroup",
            name: "daytime_dysfunction",
            title: "지난 한 월간 운전 중이나 식사를 할 때, 혹은 사회적 활동에 참여할 때 얼마나 자주 깨어있기가 힘들고 졸렸습니까?",
            choices: [
              { value: 0, text: "지난 한 월간 없었다" },
              { value: 1, text: "주 1회 이하" },
              { value: 2, text: "주 1-2회" },
              { value: 3, text: "주 3회 이상" }
            ]
          },
          {
            type: "radiogroup",
            name: "daytime_motivation",
            title: "지난 한 월간 충분한 의욕을 가지고 일을 해내는 데 얼마나 어려움이 있었습니까?",
            choices: [
              { value: 0, text: "아무 문제 없었다" },
              { value: 1, text: "단지 작은 어려움만 있었다" },
              { value: 2, text: "어느 정도 어려움이 있었다" },
              { value: 3, text: "아주 큰 어려움이 있었다" }
            ]
          }
        ]
      }
    ]
  };

  // Backend에서 제공된 PSQI 결과 (완성된 데이터 - 제공된 Firebase 데이터 기반)
  const psqiResult: RatingResult = {
    score: 5,
    interpretation: "좋은 수면",
    patient_id: "12345",
    submission_date: "June 6, 2025 at 8:47:27 AM UTC+9",
    subscores: {
      "Daytime dysfunction": 1,
      "Habitual sleep efficiency": 0,
      "Sleep disturbance": 1,
      "Sleep duration": 1,
      "Sleep latency": 0
    },
    responses: {
      daytime_dysfunction: 1,
      daytime_motivation: 1,
      hour_to_goto_sleep: "23:30",
      psqi_sleep_disturbances: {
        a: 0,
        b: 1,
        c: 1,
        d: 0,
        e: 0,
        f: 1,
        g: 1,
        h: 1,
        i: 2,
        j: 0
      },
      sleep_duration: 7,
      sleep_medication: 1,
      sleep_onset: "0",
      sleep_quality: 1,
      wakeup_time: "06:40"
    }
  };

  // PHQ-9 구조 예시
  const phq9Structure: SurveyStructure = {
    pages: [
      {
        elements: [
          {
            type: "matrix",
            name: "phq9-scale",
            title: "Patient Health Questionnaire-9",
            columns: [
              { value: 0, text: "전혀 그렇지 않다" },
              { value: 1, text: "며칠간" },
              { value: 2, text: "일주일 이상" },
              { value: 3, text: "거의 매일" }
            ],
            rows: [
              { value: "phq9-01", text: "일 또는 다른 활동을 하는 데 흥미나 즐거움을 느끼지 못함" },
              { value: "phq9-02", text: "기분이 가라앉거나, 우울하거나, 희망이 없다고 느낌" },
              { value: "phq9-03", text: "잠들기 어렵거나 자주 깨거나 너무 많이 잠" },
              { value: "phq9-04", text: "피곤하다고 느끼거나 기력이 없음" },
              { value: "phq9-05", text: "식욕이 떨어지거나 과식을 함" },
              { value: "phq9-06", text: "자신을 나쁘게 생각하거나 자신이 실패자라고 느끼거나 자신 또는 가족을 실망시켰다고 생각함" },
              { value: "phq9-07", text: "신문을 읽거나 TV를 보는 것과 같은 일에 집중하는 데 어려움이 있음" },
              { value: "phq9-08", text: "다른 사람들이 눈치 챌 정도로 움직이거나 말하기를 평상시보다 느리게 하거나 반대로 평상시보다 많이 움직여서 가만히 있지 못함" },
              { value: "phq9-09", text: "자신이 죽는 것이 더 낫겠다고 생각하거나 어떤 식으로든 자신을 해칠 것이라고 생각함" }
            ]
          }
        ]
      }
    ]
  };

  // Backend에서 제공된 PHQ-9 결과
  const phq9Result: RatingResult = {
    score: 10,
    interpretation: "중등도 우울",
    responses: {
      "phq9-01": 2,
      "phq9-02": 2,
      "phq9-03": 1,
      "phq9-04": 2,
      "phq9-05": 1,
      "phq9-06": 1,
      "phq9-07": 1,
      "phq9-08": 0,
      "phq9-09": 0
    }
  };

  return (
    <div className="space-y-8 p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
        Rating Scale 결과 컴포넌트 예시 (Backend 완성 데이터)
      </h1>
      
      {/* PSQI 예시 (복잡한 구조) */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          Pittsburgh Sleep Quality Index (PSQI) - Backend 완성 데이터
        </h2>
        <div className="bg-green-50 p-3 rounded-lg mb-4 border-l-4 border-green-400">
          <p className="text-sm text-green-800">
            <strong>Backend 처리:</strong> 총점 5점, "좋은 수면" 해석과 subscores가 이미 계산되어 제공됩니다. 
            Frontend는 단순히 데이터를 표시만 합니다.
          </p>
        </div>
        <RatingHardcopy 
          scaleName="psqi"
          structure={psqiStructure}
          result={psqiResult}
          patientInfo={{
            ...patientInfo,
            name: "이수면",
            id: "P-2024-003",
            date: "2024-06-06"
          }}
        />
      </div>

      {/* BAI 예시 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          Beck Anxiety Inventory (BAI) - Backend 완성 데이터
        </h2>
        <RatingHardcopy 
          scaleName="bai"
          structure={baiStructure}
          result={baiResult}
          patientInfo={patientInfo}
        />
      </div>

      {/* PHQ-9 예시 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          Patient Health Questionnaire-9 (PHQ-9) - Backend 완성 데이터
        </h2>
        <RatingHardcopy 
          scaleName="phq9"
          structure={phq9Structure}
          result={phq9Result}
          patientInfo={{
            ...patientInfo,
            name: "김영희",
            id: "P-2024-002",
            date: "2024-01-16"
          }}
        />
      </div>

      {/* 사용법 설명 */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4">간소화된 컴포넌트 사용법</h2>
        <div className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
            <p className="text-sm text-blue-800">
              <strong>주요 변경사항:</strong> Frontend에서 점수 계산과 해석을 제거하고, 
              Backend에서 제공되는 완성된 데이터를 그대로 표시합니다.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-gray-700">필수 Props:</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
              <li><code className="bg-gray-100 px-1 rounded">scaleName</code>: rating scale 이름 (표시용)</li>
              <li><code className="bg-gray-100 px-1 rounded">structure</code>: Survey.js 형식의 질문지 구조 (응답 표시용)</li>
              <li><code className="bg-gray-100 px-1 rounded">result</code>: Backend에서 제공되는 완성된 결과 데이터</li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-gray-700">Backend 제공 데이터 구조:</h3>
            <div className="text-sm text-gray-600 mt-2 space-y-1">
              <p><code className="bg-gray-100 px-1 rounded">score</code>: 총점 (이미 계산됨)</p>
              <p><code className="bg-gray-100 px-1 rounded">interpretation</code>: 해석 결과 (이미 분석됨)</p>
              <p><code className="bg-gray-100 px-1 rounded">subscores</code>: 하위 점수들 (선택적, PSQI 등)</p>
              <p><code className="bg-gray-100 px-1 rounded">responses</code>: 원본 응답 데이터</p>
              <p><code className="bg-gray-100 px-1 rounded">patient_id, submission_date</code>: 메타데이터 (선택적)</p>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-700">Frontend의 역할:</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
              <li>Backend 데이터를 받아서 의사용 UI로 표시</li>
              <li>다양한 element type (matrix, radiogroup, text) 응답 렌더링</li>
              <li>해석 결과에 따른 시각적 색상 적용</li>
              <li>Subscores 그리드 표시 (있는 경우)</li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-gray-700">장점:</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
              <li><strong>단순화:</strong> Frontend는 표시만 담당, 복잡한 계산은 Backend에서</li>
              <li><strong>일관성:</strong> 모든 rating scale의 점수 계산이 Backend에서 표준화</li>
              <li><strong>유지보수:</strong> 점수 기준 변경 시 Backend만 수정하면 됨</li>
              <li><strong>확장성:</strong> 새로운 rating scale 추가가 더 쉬움</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RatingHardcopyExample; 