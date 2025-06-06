import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import dynamic from 'next/dynamic';
import remarkGfm from 'remark-gfm';
const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false });

interface ScaleSummary {
  score: number | null;
  summary: string;
  submission_date: string;
}

interface ReportSummaryProps {
  scaleName: string;
  summary: ScaleSummary;
}

export function ReportSummary({ scaleName, summary }: ReportSummaryProps) {
  const formattedDate = summary.submission_date
    ? format(new Date(summary.submission_date), 'yyyy년 MM월 dd일', { locale: ko })
    : 'N/A';

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">{scaleName}</CardTitle>
          <div className="flex items-center gap-2">
            {summary.score !== null && (
              <Badge variant="secondary" className="text-sm">
                점수: {summary.score}
              </Badge>
            )}
            <Badge variant="outline" className="text-sm">
              {formattedDate}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary.summary}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
} 