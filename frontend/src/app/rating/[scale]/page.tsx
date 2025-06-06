"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const RATING_ORDER = [
  'demographic',
  'past-history',
  'audit',
  'psqi',
  'bdi',
  'bai',
  'k-mdq',
];

const RatingPage = dynamic(() => import("@/components/Rating"), {
  ssr: false
});

// Available scales mapping
const AVAILABLE_SCALES: Record<string, { 
  title: string; 
  description: string; 
  filename: string 
}> = {
  demographic: {
    title: "Demographic Information",
    description: "Please provide your basic information to help us better understand your needs.",
    filename: "demographic.json"
  },
  psqi: {
    title: "Pittsburgh Sleep Quality Index (PSQI)",
    description: "This questionnaire will help us understand your sleep patterns and quality.",
    filename: "psqi.json"
  },
  bdi: {
    title: "Beck Depression Inventory (BDI)",
    description: "This assessment helps evaluate depression symptoms.",
    filename: "bdi.json"
  },
  "past-history": {
    title: "Past Medical History",
    description: "Please provide information about your medical history.",
    filename: "past_history.json"
  },
  bai: {
    title: "Beck Anxiety Inventory (BAI)",
    description: "This assessment helps evaluate anxiety symptoms and related physical sensations.",
    filename: "bai.json"
  },
  audit: {
    title: "AUDIT (Alcohol Use Disorders Identification Test)",
    description: "This assessment helps identify alcohol use patterns and potential alcohol-related problems.",
    filename: "audit.json"
  },
  "k-mdq": {
    title: "K-MDQ (한국형 조울병 선별검사지)",
    description: "This assessment helps screen for bipolar disorder and manic episodes.",
    filename: "k-mdq.json"
  }
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
        const schemaModule = await import(`../../../../questionnaire/${scaleConfig.filename}`);
        setSchema(schemaModule.default);
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

  const scaleConfig = AVAILABLE_SCALES[scale];

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