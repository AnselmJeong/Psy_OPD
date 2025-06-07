'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RatingHardcopy from '../../../../../components/RatingHardcopy';
import { getToken } from '../../../../../lib/auth';
import AuthGuard from '@/components/AuthGuard';
import { DASHBOARD_SCALES, getAllScales } from '@/constants/scales';

// API 기본 설정
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// 사용 가능한 scale들 (중앙화된 상수에서 변환)
const AVAILABLE_SCALES = DASHBOARD_SCALES.map(scaleKey => {
  const scaleInfo = getAllScales()[scaleKey];
  return {
    value: scaleKey,
    label: `${scaleInfo?.title || scaleKey.toUpperCase()}`,
    description: scaleInfo?.category || ''
  };
});

// 간단한 fetch 함수
const fetchData = async (url: string) => {
  const token = typeof window !== 'undefined' ? getToken('clinician') : null;
  
  console.log('Making request to:', url);
  console.log('Token exists:', !!token);
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
  
  console.log('Request headers:', headers);
  
  const response = await fetch(url, {
    headers,
  });

  console.log('Response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.log('Error response:', errorText);
    throw new Error(`HTTP Error: ${response.status} - ${errorText}`);
  }

  return response.json();
};

export default function PatientRatingPage() {
  const params = useParams();
  const router = useRouter();
  
  const patientId = params.patient_id as string;
  
  // 상태 관리
  const [selectedScale, setSelectedScale] = useState<string>('');
  const [structure, setStructure] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [patientInfo, setPatientInfo] = useState<any>(null);
  const [availableResults, setAvailableResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 환자 정보 및 사용 가능한 결과 로딩
  useEffect(() => {
    const loadPatientInfo = async () => {
      if (!patientId) return;

                    try {
         // 1. 사용 가능한 scale을 하드코딩된 목록에서 확인 (임시)
         const potentialScales = ['bdi', 'bai', 'audit', 'psqi', 'k-mdq', 'oci-r', 'pcl-k-5'];
         const availableScales: string[] = [];

         // 각 scale별로 개별적으로 확인
         for (const scale of potentialScales) {
           try {
             const scaleUrl = `${API_BASE_URL}/api/v1/survey/patient/${patientId}?survey_type=${scale}`;
             const scaleResults = await fetchData(scaleUrl);
             if (scaleResults && scaleResults.length > 0) {
               availableScales.push(scale);
             }
           } catch (err) {
             console.log(`Scale ${scale} not available:`, err);
           }
         }
         
         console.log('[DEBUG] Available scales:', availableScales);
         setAvailableResults(availableScales);

                 // 2. 환자 정보 가져오기 (dashboard API 사용)
         try {
           const overviewUrl = `${API_BASE_URL}/api/v1/dashboard/patients-overview`;
           const patientsOverview = await fetchData(overviewUrl);
           const patientOverview = patientsOverview.find((p: any) => p.patient_id === patientId);
           
           if (patientOverview) {
             const patientData = {
               id: patientId,
               name: patientOverview.name || '미상',
               age: patientOverview.age,
               gender: patientOverview.gender || '미상',
               date: new Date().toISOString()
             };
             setPatientInfo(patientData);
           } else {
             // Fallback to demographic survey
             const demographicUrl = `${API_BASE_URL}/api/v1/survey/patient/${patientId}?survey_type=demographic`;
             const demographicResults = await fetchData(demographicUrl);
             if (demographicResults && demographicResults.length > 0) {
               const demographic = demographicResults[0];
               const patientData = {
                 id: patientId,
                 name: demographic.responses?.이름 || demographic.responses?.name || '미상',
                 age: demographic.responses?.나이 || demographic.responses?.age,
                 gender: demographic.responses?.성별 || demographic.responses?.gender || '미상',
                 date: demographic.submission_date
               };
               setPatientInfo(patientData);
             }
           }
         } catch (err) {
           console.log('환자 정보를 가져올 수 없습니다:', err);
           // 기본 환자 정보
           setPatientInfo({
             id: patientId,
             name: '환자',
             date: new Date().toISOString()
           });
         }

        // 3. 첫 번째 사용 가능한 scale을 기본 선택
        if (availableScales.length > 0) {
          setSelectedScale(availableScales[0]);
        }

             } catch (err: any) {
         console.error('Error loading patient info:', err);
         // 부분적으로 실패해도 기본 환자 정보는 설정
         setPatientInfo({
           id: patientId,
           name: `환자 ${patientId}`,
           date: new Date().toISOString()
         });
         setError(err.message || '환자 정보를 로딩하는 중 오류가 발생했습니다.');
       }
    };

    loadPatientInfo();
  }, [patientId]);

  // 선택된 scale의 결과 로딩
  useEffect(() => {
    const loadScaleResult = async () => {
      if (!selectedScale || !patientId) return;

      try {
        setLoading(true);
        setError(null);

        // 1. Questionnaire 구조 가져오기
        const structureResponse = await fetch(`/questionnaire/${selectedScale}.json`);
        if (!structureResponse.ok) {
          throw new Error(`${selectedScale} questionnaire 파일을 찾을 수 없습니다.`);
        }
        const structureData = await structureResponse.json();

        // 2. Survey 결과 가져오기
        const surveyUrl = `${API_BASE_URL}/api/v1/survey/patient/${patientId}?survey_type=${selectedScale}`;
        const surveyResults = await fetchData(surveyUrl);
        
        if (!surveyResults || surveyResults.length === 0) {
          throw new Error(`${selectedScale.toUpperCase()} 결과를 찾을 수 없습니다.`);
        }

        // 최신 결과 사용 (첫 번째 결과)
        const latestResult = surveyResults[0];

        // Backend 결과를 RatingHardcopy 컴포넌트 형식에 맞게 변환
        let flattenedResponses = {};
        if (latestResult.responses) {
          const responseKeys = Object.keys(latestResult.responses);
          if (responseKeys.length === 1 && typeof latestResult.responses[responseKeys[0]] === 'object') {
            // Nested 구조인 경우 flatten
            const nestedResponses = latestResult.responses[responseKeys[0]];
            flattenedResponses = nestedResponses;
          } else {
            // 이미 flat 구조인 경우
            flattenedResponses = latestResult.responses;
          }
        }

        const transformedResult = {
          score: latestResult.score,
          interpretation: latestResult.summary || '해석 정보 없음',
          subscores: latestResult.subscores || undefined,
          responses: flattenedResponses,
          submission_date: latestResult.submission_date,
          patient_id: patientId
        };

        setStructure(structureData);
        setResult(transformedResult);

      } catch (err: any) {
        setError(err.message || '데이터를 로딩하는 중 오류가 발생했습니다.');
        console.error('Error loading scale result:', err);
      } finally {
        setLoading(false);
      }
    };

    loadScaleResult();
  }, [selectedScale, patientId]);

  // 핸들러들
  const handleGoBack = () => {
    router.push('/doctor/dashboard');
  };

  const handleScaleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedScale(event.target.value);
  };

  const handlePrint = () => {
    window.print();
  };

  // Scale 선택 드롭다운 렌더링
  const renderScaleSelector = () => {
    const filteredScales = AVAILABLE_SCALES.filter(scale => 
      availableResults.includes(scale.value)
    );

    return (
      <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">검사 결과 조회</h2>
          <div className="flex gap-2">
            
            <button
              onClick={handleGoBack}
              className="px-4 py-2 text-green-700 bg-green-50 border border-green-200 rounded-md font-medium hover:bg-green-100 transition-colors"
            >
              ← 대시보드로
            </button>
          </div>
        </div>
        
        {patientInfo && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">환자 정보</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">환자 ID:</span>
                <p className="font-medium">{patientInfo.id}</p>
              </div>
              <div>
                <span className="text-gray-500">이름:</span>
                <p className="font-medium">{patientInfo.name}</p>
              </div>
              {patientInfo.age && (
                <div>
                  <span className="text-gray-500">나이:</span>
                  <p className="font-medium">{patientInfo.age}세</p>
                </div>
              )}
              {patientInfo.gender && (
                <div>
                  <span className="text-gray-500">성별:</span>
                  <p className="font-medium">{patientInfo.gender}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <label className="flex-shrink-0 font-medium text-gray-700">
            검사 척도 선택:
          </label>
          <select
            value={selectedScale}
            onChange={handleScaleChange}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">검사를 선택하세요</option>
            {filteredScales.map((scale) => (
              <option key={scale.value} value={scale.value}>
                {scale.label} - {scale.description}
              </option>
            ))}
          </select>
          {selectedScale && (
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-blue-500 bg-blue-200 border border-blue-200 rounded-md font-medium hover:bg-blue-100 transition-colors flex items-center gap-2"
            >
              🖨️ 인쇄
            </button>
          )}
        </div>

        {filteredScales.length === 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">
              이 환자에 대한 검사 결과가 없습니다.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <AuthGuard requiredAuth="doctor">
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto py-8 px-4">
          {renderScaleSelector()}

          {/* 로딩 상태 */}
          {loading && (
            <div className="bg-white p-8 rounded-lg shadow-lg text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">데이터 로딩 중...</h2>
              <p className="text-gray-500">
                {selectedScale?.toUpperCase()} 결과를 불러오고 있습니다.
              </p>
            </div>
          )}

          {/* 에러 상태 */}
          {error && !loading && (
            <div className="bg-white p-8 rounded-lg shadow-lg text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">데이터 로딩 실패</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => setError(null)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                다시 시도
              </button>
            </div>
          )}

                     {/* 결과 표시 */}
           {!loading && !error && selectedScale && structure && result && patientInfo && (
             <div className="bg-white rounded-lg shadow-lg overflow-hidden">
               <RatingHardcopy
                 scaleName={selectedScale}
                 structure={structure}
                 result={result}
                 patientInfo={patientInfo}
               />
             </div>
           )}

          {/* 빈 상태 */}
          {!loading && !error && !selectedScale && (
            <div className="bg-white p-12 rounded-lg shadow-lg text-center">
              <div className="text-gray-400 text-6xl mb-4">📊</div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">검사 척도를 선택하세요</h2>
              <p className="text-gray-500">
                위의 드롭다운에서 조회하고 싶은 검사 척도를 선택해주세요.
              </p>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
} 