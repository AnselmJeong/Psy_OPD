"use client";
import { useEffect, useState } from "react";

interface Survey {
  survey_type: string;
  submission_date: string;
  score?: number;
}

interface PatientSurveyList {
  patient_id: string;
  surveys: Survey[];
}

export default function DoctorDashboardPage() {
  const [data, setData] = useState<PatientSurveyList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("clinician_token");
        const response = await fetch("http://localhost:8000/api/v1/dashboard/patients", {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });
        if (!response.ok) {
          throw new Error("Failed to fetch patient survey data");
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

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">환자 설문 대시보드</h1>
      {loading ? (
        <div className="text-center text-gray-500">불러오는 중...</div>
      ) : error ? (
        <div className="text-center text-red-500">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow">
            <thead>
              <tr>
                <th className="px-4 py-2 border-b">환자 ID</th>
                <th className="px-4 py-2 border-b">설문 종류</th>
                <th className="px-4 py-2 border-b">평가 날짜</th>
                <th className="px-4 py-2 border-b">점수</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400">데이터가 없습니다.</td>
                </tr>
              ) : (
                data.flatMap((patient) =>
                  patient.surveys.map((survey, idx) => (
                    <tr key={`${patient.patient_id}-${survey.survey_type}-${survey.submission_date}-${idx}`}>
                      <td className="px-4 py-2 border-b text-center">{patient.patient_id}</td>
                      <td className="px-4 py-2 border-b text-center">{survey.survey_type}</td>
                      <td className="px-4 py-2 border-b text-center">{survey.submission_date ? new Date(survey.submission_date).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-2 border-b text-center">{survey.score !== undefined ? survey.score : '-'}</td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 