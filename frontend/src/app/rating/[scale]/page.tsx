"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { 
  RATING_ORDER, 
  AVAILABLE_SCALES,
  getScaleInfo,
  getScaleConfig,
  type ScaleConfig 
} from "@/constants/scales";

const RatingPage = dynamic(() => import("@/components/Rating"), {
  ssr: false
});

// Helper function to get scale display information
const getScaleDisplayInfo = (scaleKey: string) => {
  const scaleInfo = getScaleInfo(scaleKey);
  const scaleConfig = getScaleConfig(scaleKey);
  
  if (!scaleInfo || !scaleConfig) {
    return null;
  }

  // Create enhanced descriptions for better user experience
  const enhancedDescriptions: Record<string, string> = {
    demographic: "당신의 기본 정보를 제공해 주시면, 환자분의 필요를 더 잘 이해하는데 도움이 됩니다.",
    psqi: "당신의 수면 패턴과 질을 평가합니다.",
    bdi: "우울증 증상을 평가합니다.",
    "past-history": "당신의 과거력과 가족력을 제공해 주시면, 환자분의 필요를 더 잘 이해하는데 도움이 됩니다.",
    bai: "주로 불안증과 관련된 신체적 이상 감각을 평가합니다.",
    audit: "음주 사용 패턴과 관련된 문제를 식별합니다.",
    "k-mdq": "감정기복 및 양극성 장애 관련 증상을 평가합니다.",
    "oci-r": "강박사고나 행동을 평가합니다.",
    "k-epds": "산후 우울증 증상을 평가합니다.",
    "gds-sf": "노년층의 우울증 증상을 평가합니다.",
    "pdss-sr": "공황장애 증상과 심각도를 평가합니다.",
    "pcl-k-5": "외상 후 스트레스 장애 증상을 평가합니다.",
    "pswq": "평소 걱정과 불안 성향을 평가합니다."
  };

  return {
    title: scaleConfig.title,
    description: enhancedDescriptions[scaleKey] || scaleInfo.description,
    filename: scaleConfig.file
  };
};

export default function ScalePage() {
  const params = useParams();
  const router = useRouter();
  const scale = params.scale as string;
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const loadSchema = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!AVAILABLE_SCALES[scale]) {
          setError(`Rating scale "${scale}" not found. Available scales: ${Object.keys(AVAILABLE_SCALES).join(', ')}`);
          setLoading(false);
          return;
        }
        const scaleConfig = AVAILABLE_SCALES[scale];
        const displayInfo = getScaleDisplayInfo(scale);
        
        if (!displayInfo) {
          throw new Error(`Scale "${scale}" configuration not found`);
        }
        
        const response = await fetch(`/questionnaire/${scaleConfig.file}`);
        if (!response.ok) {
          throw new Error(`Failed to load questionnaire file: ${scaleConfig.file}`);
        }
        const schemaData = await response.json();
        setSchema(schemaData);
      } catch (err) {
        console.error('Error loading schema:', err);
        setError(`Failed to load rating scale "${scale}". Please check if the file exists.`);
      } finally {
        setLoading(false);
      }
    };
    if (scale) {
      loadSchema();
    }
  }, [scale]);

  const handleComplete = () => {
    // localStorage에 완료된 scale 기록
    if (typeof window !== 'undefined') {
      const completed = JSON.parse(localStorage.getItem('completedScales') || '[]');
      if (!completed.includes(scale)) {
        completed.push(scale);
        localStorage.setItem('completedScales', JSON.stringify(completed));
      }
    }
    // 현재 scale이 RATING_ORDER에서 몇 번째인지 찾고, 다음 scale로 이동
    const idx = RATING_ORDER.indexOf(scale);
    if (idx !== -1 && idx < RATING_ORDER.length - 1) {
      const nextScale = RATING_ORDER[idx + 1];
      router.push(`/rating/${nextScale}`);
    } else {
      setCompleted(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600">Loading rating scale...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h1 className="text-2xl font-bold text-red-800 mb-2">Error</h1>
              <p className="text-red-600">{error}</p>
              <div className="mt-4">
                <button 
                  onClick={() => window.history.back()}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!schema) {
    return null;
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <h1 className="text-3xl font-bold mb-4 text-green-700">Thank you for completing all surveys!</h1>
          <p className="text-lg text-gray-700 mb-6">Your responses have been recorded.</p>
          <button
            onClick={() => router.push('/report')}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            View Report
          </button>
        </div>
      </div>
    );
  }

  const scaleConfig = getScaleDisplayInfo(scale);

  if (!scaleConfig) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h1 className="text-2xl font-bold text-red-800 mb-2">Scale Not Found</h1>
              <p className="text-red-600">The requested assessment scale "{scale}" is not available.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {scaleConfig.title}
          </h1>
          <p className="text-lg text-gray-600">
            {scaleConfig.description}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-8 min-w-[1000px] w-full mx-auto">
          <RatingPage schema={schema} onComplete={handleComplete} scale={scale} />
        </div>
      </div>
    </div>
  );
} 