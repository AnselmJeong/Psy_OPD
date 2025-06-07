'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ReportSummary } from '@/components/ReportSummary';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { authenticatedFetch } from '@/lib/auth';
import Link from 'next/link';
import { REQUIRED_SCALES, ELECTIVE_SCALES } from '@/constants/scales';

interface ScaleSummary {
  score: number | null;
  summary: string;
  submission_date: string;
}

interface ScaleReportData {
  patient_id: string;
  scale_name: string;
  scale_summary: ScaleSummary;
}

export default function ScaleReportPage() {
  const router = useRouter();
  const params = useParams();
  const scale = params.scale as string;
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const [reportData, setReportData] = useState<ScaleReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get scale information from constants
  const allScales = { ...REQUIRED_SCALES, ...ELECTIVE_SCALES };
  const scaleInfo = allScales[scale as keyof typeof allScales];

  useEffect(() => {
    // 인증 로딩이 완료된 후에 검사
    if (authLoading) return;

    // 인증되지 않았거나 환자가 아닌 경우 로그인 페이지로 리다이렉트
    if (!isAuthenticated || user?.type !== 'patient') {
      router.push('/patient-login');
      return;
    }

    if (!scale) {
      setError('척도 정보가 없습니다.');
      setLoading(false);
      return;
    }

    const fetchScaleReport = async () => {
      try {
        // Fetch the full report first, then extract the specific scale data
        const response = await authenticatedFetch(
          `/api/v1/patient/report`,
          {},
          'patient'
        );
        
        if (!response.ok) {
          throw new Error('보고서를 불러오는데 실패했습니다.');
        }

        const data = await response.json();
        
        // Map scale name to backend format
        const scaleMapping: Record<string, string> = {
          'demographic': 'DEMOGRAPHIC',
          'past-history': 'PAST_HISTORY',
          'audit': 'AUDIT',
          'psqi': 'PSQI',
          'bdi': 'BDI',
          'bai': 'BAI',
          'k-mdq': 'K-MDQ',
          'oci-r': 'OCI-R',
          'k-epds': 'K-EPDS',
          'gds-sf': 'GDS-SF',
          'pdss-sr': 'PDSS-SR',
          'pcl-k-5': 'PCL-K-5',
          'pswq': 'PSWQ'
        };

        const backendScaleName = scaleMapping[scale.toLowerCase()] || scale.toUpperCase();
        
        // Check if the scale exists in the report
        if (!data.scale_summaries || !data.scale_summaries[backendScaleName]) {
          throw new Error('해당 척도의 평가 결과를 찾을 수 없습니다.');
        }

        setReportData({
          patient_id: data.patient_id,
          scale_name: backendScaleName,
          scale_summary: data.scale_summaries[backendScaleName]
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchScaleReport();
  }, [router, isAuthenticated, user, authLoading, scale]);

  // 인증 로딩 중일 때
  if (authLoading || loading) {
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
        <div className="flex gap-2">
          <Button onClick={() => router.back()}>
            뒤로 가기
          </Button>
          <Button onClick={() => window.location.reload()}>
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with back button */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/rating"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            평가 목록으로 돌아가기
          </Link>
        </div>

        <div className="flex items-center gap-4 mb-8">
          {scaleInfo && (
            <div className="text-4xl">
              {scaleInfo.icon}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold">
              {scaleInfo?.title || reportData.scale_name} 평가 결과
            </h1>
            {scaleInfo && (
              <p className="text-gray-600 mt-2">{scaleInfo.description}</p>
            )}
          </div>
        </div>

        {/* Scale Report */}
        <div className="mb-8">
          <ReportSummary
            scaleName={reportData.scale_name}
            summary={reportData.scale_summary}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-4 justify-center">
          <Link href="/rating">
            <Button variant="outline">
              다른 평가 보기
            </Button>
          </Link>
          <Link href="/report">
            <Button>
              전체 보고서 보기
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
} 