"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";

interface AssessmentStatus {
  status: string;
  last_completion_date?: string;
}

interface PatientAssessmentOverview {
  patient_id: string;
  name: string;
  age: number;
  gender: string;
  essential_assessments: AssessmentStatus;
  elective_assessments: string[];
}

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'complete':
        return { text: 'Complete', bgColor: 'bg-green-100', textColor: 'text-green-800', icon: '✓' };
      case 'in_progress':
        return { text: 'In Progress', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', icon: '⚠' };
      case 'not_started':
        return { text: 'Not Started', bgColor: 'bg-red-100', textColor: 'text-red-800', icon: '⊘' };
      default:
        return { text: 'Unknown', bgColor: 'bg-gray-100', textColor: 'text-gray-800', icon: '?' };
    }
  };

  const config = getStatusConfig(status);
  
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.textColor}`}>
      <span className="text-xs">{config.icon}</span>
      {config.text}
    </span>
  );
};

// Assessment chip component
const AssessmentChip = ({ assessment }: { assessment: string }) => {
  // Map assessment types to display names and colors
  const getAssessmentConfig = (assessment: string) => {
    const configs: Record<string, { name: string; color: string }> = {
      // Elective assessments
      'OCI-R': { name: 'OCI-R (강박장애)', color: 'bg-purple-100 text-purple-800' },
      'PCL-K-5': { name: 'PCL-K-5 (PTSD)', color: 'bg-red-100 text-red-800' },
      
      // Legacy assessments (if they appear in elective)
      'ANXIETY': { name: 'Anxiety', color: 'bg-blue-100 text-blue-800' },
      'DEPRESSION': { name: 'Depression', color: 'bg-indigo-100 text-indigo-800' },
      'ADHD': { name: 'ADHD', color: 'bg-purple-100 text-purple-800' },
      'BIPOLAR': { name: 'Bipolar Disorder', color: 'bg-pink-100 text-pink-800' },
      'PTSD': { name: 'PTSD', color: 'bg-red-100 text-red-800' },
      'OCD': { name: 'OCD', color: 'bg-orange-100 text-orange-800' },
      'EATING_DISORDER': { name: 'Eating Disorder', color: 'bg-green-100 text-green-800' },
      'K-MDQ': { name: 'K-MDQ', color: 'bg-pink-100 text-pink-800' },
      'BAI': { name: 'Anxiety', color: 'bg-blue-100 text-blue-800' },
      'BDI': { name: 'Depression', color: 'bg-indigo-100 text-indigo-800' },
    };
    
    return configs[assessment] || { name: assessment, color: 'bg-gray-100 text-gray-800' };
  };

  const config = getAssessmentConfig(assessment);
  
  return (
    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${config.color} mr-1 mb-1`}>
      {config.name}
    </span>
  );
};

export default function DoctorDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<PatientAssessmentOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("clinician_token");
        const response = await fetch("http://localhost:8000/api/v1/dashboard/patients-overview", {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch patient overview data");
        }
        
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('ko-KR');
    } catch {
      return '-';
    }
  };

  // Filter patients based on search query
  const filteredData = data.filter((patient) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    return (
      patient.patient_id.toLowerCase().includes(query) ||
      patient.name.toLowerCase().includes(query)
    );
  });

  return (
    <AuthGuard requiredAuth="doctor">
      <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-green-600 text-xl">🧠</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">환자 현황 게시판</h1>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="환자 ID 또는 이름으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500 sm:text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <div className="mt-2 text-sm text-gray-600">
            {filteredData.length}개의 환자가 검색되었습니다 (전체 {data.length}명 중)
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <span className="ml-2 text-gray-600">Loading patient data...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">Error loading data</div>
          <div className="text-red-600 text-sm mt-1">{error}</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border-separate border-spacing-0">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider border-t-2 border-b border-r border-gray-400 border-t-gray-500 bg-gray-50 w-24">
                    병록번호
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider border-t-2 border-b border-r border-gray-400 border-t-gray-500 bg-gray-50 w-20">
                    이름
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider border-t-2 border-b border-r border-gray-400 border-t-gray-500 bg-gray-50 w-16">
                    나이
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider border-t-2 border-b border-r border-gray-400 border-t-gray-500 bg-gray-50 w-16">
                    성별
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider border-t-2 border-b border-r border-gray-400 border-t-gray-500 bg-gray-50 w-32">
                    필수 평가
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider border-t-2 border-b border-r border-gray-400 border-t-gray-500 bg-gray-50 w-64">
                    선택 평가
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider border-t-2 border-b border-gray-400 border-t-gray-500 bg-gray-50 w-20">
                    변화추세
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 border-b border-gray-300">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                          <span className="text-gray-400 text-xl">
                            {searchQuery ? '🔍' : '📋'}
                          </span>
                        </div>
                        <div className="text-lg font-medium text-gray-900 mb-1">
                          {searchQuery ? 'No matching patients found' : 'No patients found'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {searchQuery 
                            ? `"${searchQuery}"와 일치하는 환자가 없습니다.` 
                            : 'No patient data available at this time.'
                          }
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((patient) => (
                    <tr key={patient.patient_id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap border-b border-r border-gray-400">
                        <button
                          onClick={() => router.push(`/doctor/dashboard/rating/${patient.patient_id}`)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer underline"
                        >
                          {patient.patient_id}
                        </button>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap border-b border-r border-gray-400">
                        <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap border-b border-r border-gray-400">
                        <div className="text-sm text-gray-900">{patient.age || '-'}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap border-b border-r border-gray-400">
                        <div className="text-sm text-gray-900">{patient.gender}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap border-b border-r border-gray-400">
                        <div className="space-y-1">
                          <StatusBadge status={patient.essential_assessments.status} />
                          {patient.essential_assessments.last_completion_date && (
                            <div className="text-xs text-gray-500">
                              Last: {formatDate(patient.essential_assessments.last_completion_date)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 border-b border-r border-gray-400">
                        <div className="flex flex-wrap">
                          {patient.elective_assessments.length > 0 ? (
                            patient.elective_assessments.map((assessment, index) => (
                              <AssessmentChip key={index} assessment={assessment} />
                            ))
                          ) : (
                            <span className="text-sm text-gray-400 italic">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap border-b border-gray-400">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => router.push(`/doctor/dashboard/trend/${patient.patient_id}`)}
                            className="inline-flex items-center justify-center w-12 h-12 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="트렌드 분석"
                          >
                            <span className="text-3xl">📈</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {filteredData.length > 0 && (
            <div className="bg-white px-6 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing 1 to {filteredData.length} of {filteredData.length} results
                {searchQuery && ` (filtered from ${data.length} total)`}
              </div>
              <div className="flex items-center space-x-2">
                <button className="px-3 py-2 text-sm text-gray-500 bg-white border border-gray-400 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                  Previous
                </button>
                <button className="px-3 py-2 text-sm text-gray-500 bg-white border border-gray-400 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </AuthGuard>
  );
} 