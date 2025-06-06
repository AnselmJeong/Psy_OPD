import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import dynamic from 'next/dynamic';
import remarkGfm from 'remark-gfm';
const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false });

interface TotalSummaryProps {
  summary: string;
  generatedAt: string;
}

export function TotalSummary({ summary, generatedAt }: TotalSummaryProps) {
  const formattedDate = format(new Date(generatedAt), 'yyyy년 MM월 dd일 HH:mm', {
    locale: ko,
  });

  return (
    <Card className="mb-8 border-2 border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">종합 평가 보고서</CardTitle>
          <div className="text-sm text-muted-foreground">
            생성일시: {formattedDate}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
} 