'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ReportSummary } from '@/components/ReportSummary';
import { TotalSummary } from '@/components/TotalSummary';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { authenticatedFetch } from '@/lib/auth';

interface ScaleSummary {
  score: number | null;
  summary: string;
  submission_date: string;
}

interface ReportData {
  patient_id: string;
  scale_summaries: Record<string, ScaleSummary>;
  total_summary: string;
  generated_at: string;
}

export default function ReportPage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 인증 로딩이 완료된 후에 검사
    if (authLoading) return;

    // 인증되지 않았거나 환자가 아닌 경우 로그인 페이지로 리다이렉트
    if (!isAuthenticated || user?.type !== 'patient') {
      router.push('/patient-login');
      return;
    }

    const fetchReport = async () => {
      try {
        // Fetch the report using authenticated fetch
        const response = await authenticatedFetch(
          `/api/v1/patient/report`,
          {},
          'patient'
        );
        
        if (!response.ok) {
          throw new Error('보고서를 불러오는데 실패했습니다.');
        }

        const data = await response.json();
        setReportData(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [router, isAuthenticated, user, authLoading]);

  // 인증 로딩 중일 때
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => window.location.reload()}>
          다시 시도
        </Button>
      </div>
    );
  }

  if (!reportData) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">평가 보고서</h1>
        {/* Individual Scale Summaries First */}
        <div className="space-y-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">개별 척도 평가</h2>
          {Object.entries(reportData.scale_summaries).map(([scaleName, summary]) => (
            <ReportSummary
              key={scaleName}
              scaleName={scaleName}
              summary={summary}
            />
          ))}
        </div>
        {/* Total Summary at the end */}
        <TotalSummary
          summary={reportData.total_summary}
          generatedAt={reportData.generated_at}
        />
      </div>
    </div>
  );
} 