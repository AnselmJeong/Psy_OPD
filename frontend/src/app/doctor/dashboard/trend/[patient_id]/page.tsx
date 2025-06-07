"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AuthGuard from "@/components/AuthGuard";

interface TrendDataPoint {
  submission_date: string;
  score: number;
}

interface TrendData {
  patient_id: string;
  survey_type: string;
  trend_data: TrendDataPoint[];
}

interface TrendScale {
  scale: string;
  count: number;
}

interface PatientTrendInfo {
  patient_id: string;
  name: string;
  age: number;
  gender: string;
  trend_scales: TrendScale[];
}

// Scale name mapping for display
const getScaleDisplayName = (scale: string) => {
  const scaleNames: Record<string, string> = {
    'BDI': 'Beck Depression Inventory (BDI)',
    'BAI': 'Beck Anxiety Inventory (BAI)',
    'AUDIT': 'Alcohol Use Disorders Identification Test (AUDIT)',
    'PSQI': 'Pittsburgh Sleep Quality Index (PSQI)',
    'K-MDQ': 'Korean Mood Disorder Questionnaire (K-MDQ)',
    'OCI-R': 'Obsessive-Compulsive Inventory-Revised (OCI-R)',
    'PCL-K-5': 'PTSD Checklist for DSM-5 Korean Version (PCL-K-5)',
  };
  return scaleNames[scale] || scale;
};

export default function PatientTrendPage() {
  const params = useParams();
  const router = useRouter();
  const patient_id = params.patient_id as string;

  const [patientInfo, setPatientInfo] = useState<PatientTrendInfo | null>(null);
  const [selectedScale, setSelectedScale] = useState<string>('');
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch patient trend scales
  useEffect(() => {
    const fetchPatientTrendScales = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("clinician_token");
        const response = await fetch(`http://localhost:8000/api/v1/dashboard/patient/${patient_id}/trend-scales`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch patient trend scales");
        }
        
        const result: PatientTrendInfo = await response.json();
        setPatientInfo(result);
        
        // Auto-select first scale if available
        if (result.trend_scales.length > 0) {
          setSelectedScale(result.trend_scales[0].scale);
        }
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    
    if (patient_id) {
      fetchPatientTrendScales();
    }
  }, [patient_id]);

  // Fetch trend data for selected scale
  useEffect(() => {
    const fetchTrendData = async () => {
      if (!selectedScale) {
        setTrendData(null);
        return;
      }

      setChartLoading(true);
      try {
        const token = localStorage.getItem("clinician_token");
        const response = await fetch(
          `http://localhost:8000/api/v1/dashboard/patient/${patient_id}/trends?survey_type=${selectedScale}`,
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (!response.ok) {
          if (response.status === 404) {
            // No trend data available - this is not an error, just no data
            setTrendData({ patient_id, survey_type: selectedScale, trend_data: [] });
            return;
          }
          throw new Error(`Failed to fetch trend data: ${response.status} ${response.statusText}`);
        }
        
                 const result: TrendData = await response.json();
         setTrendData(result);
       } catch (err: any) {
         console.error("Error fetching trend data:", err);
         setError(err.message || "Unknown error");
         setTrendData(null);
      } finally {
        setChartLoading(false);
      }
    };
    
    fetchTrendData();
  }, [patient_id, selectedScale]);

  // Format chart data
  const formatChartData = () => {
    if (!trendData) return [];
    
    return trendData.trend_data.map(point => ({
      date: new Date(point.submission_date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      score: point.score,
      fullDate: point.submission_date
    })).sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
  };

  // Calculate score change
  const getScoreChange = () => {
    if (!trendData || trendData.trend_data.length < 2) return null;
    
    const sortedData = [...trendData.trend_data].sort((a, b) => 
      new Date(a.submission_date).getTime() - new Date(b.submission_date).getTime()
    );
    
    const firstScore = sortedData[0].score;
    const lastScore = sortedData[sortedData.length - 1].score;
    const change = lastScore - firstScore;
    const percentChange = ((change / firstScore) * 100);
    
    return {
      absolute: change,
      percent: percentChange,
      improved: change < 0 // For most scales, lower scores are better
    };
  };

  const chartData = formatChartData();
  const scoreChange = getScoreChange();

  if (loading) {
    return (
      <AuthGuard requiredAuth="doctor">
        <div className="max-w-7xl mx-auto py-8 px-4">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading patient trend data...</span>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error || !patientInfo) {
    return (
      <AuthGuard requiredAuth="doctor">
        <div className="max-w-7xl mx-auto py-8 px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800 font-medium">Error loading data</div>
            <div className="text-red-600 text-sm mt-1">{error || "Patient not found"}</div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredAuth="doctor">
      <div className="max-w-7xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/doctor/dashboard')}
              className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            >
              <span className="text-gray-600 text-xl">←</span>
            </button>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-xl">📈</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Trend Analysis</h1>
              <p className="text-gray-600 mt-1">
                {patientInfo.name} (ID: {patient_id}) • {patientInfo.age}세 {patientInfo.gender}
              </p>
            </div>
          </div>
          
          {/* Navigation Links */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/doctor/dashboard')}
              className="px-4 py-2 text-green-700 bg-green-50 border border-green-200 rounded-md font-medium hover:bg-green-100 transition-colors"
            >
              📊 대시보드로
            </button>

          </div>
        </div>

        {patientInfo.trend_scales.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📈</div>
            <div className="text-xl font-medium text-gray-900 mb-2">No Trend Data Available</div>
            <div className="text-gray-600">
              이 환자는 아직 반복 검사를 실시하지 않았습니다.
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Scale Selection */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Rating Scale
                </label>
                <select
                  value={selectedScale}
                  onChange={(e) => setSelectedScale(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  {patientInfo.trend_scales.map((scale) => (
                    <option key={scale.scale} value={scale.scale}>
                      {getScaleDisplayName(scale.scale)} ({scale.count}회 검사)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Chart Section */}
            {selectedScale && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {chartLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading chart data...</span>
                  </div>
                ) : trendData && chartData.length > 0 ? (
                  <>
                    {/* Chart Header */}
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Total Score Over Time</h3>
                        <p className="text-sm text-gray-600">{getScaleDisplayName(selectedScale)}</p>
                      </div>
                      {scoreChange && (
                        <div className="text-right">
                          <div className="text-3xl font-bold text-gray-900">
                            {chartData[chartData.length - 1].score}
                          </div>
                          <div className={`text-sm flex items-center gap-1 ${
                            scoreChange.improved ? 'text-green-600' : 'text-red-600'
                          }`}>
                            <span>전체 기간</span>
                            <span className="flex items-center">
                              {scoreChange.improved ? '↓' : '↑'} {Math.abs(scoreChange.percent).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Chart */}
                    <div className="p-6">
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#666"
                            fontSize={12}
                            tick={{ fill: '#666' }}
                          />
                          <YAxis 
                            stroke="#666"
                            fontSize={12}
                            tick={{ fill: '#666' }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                            labelStyle={{ color: '#374151' }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="score"
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ fill: '#10b981', strokeWidth: 2, r: 6 }}
                            activeDot={{ r: 8, fill: '#059669' }}
                            name="점수"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Chart Footer */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        <div className="flex items-center gap-4">
                          <span>총 {chartData.length}회 측정</span>
                          <span>•</span>
                          <span>기간: {chartData[0]?.date} ~ {chartData[chartData.length - 1]?.date}</span>
                          {scoreChange && (
                            <>
                              <span>•</span>
                              <span className={scoreChange.improved ? 'text-green-600' : 'text-red-600'}>
                                점수 변화: {scoreChange.absolute > 0 ? '+' : ''}{scoreChange.absolute.toFixed(1)}점
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="px-6 py-12 text-center text-gray-500">
                    <div className="text-gray-400 text-4xl mb-3">📊</div>
                    <div className="text-lg font-medium text-gray-900 mb-1">No trend data available</div>
                    <div className="text-sm">선택한 척도에 대한 트렌드 데이터가 없습니다.</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  );
} 