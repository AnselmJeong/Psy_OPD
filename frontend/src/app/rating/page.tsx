"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Required assessments that patients should complete
const REQUIRED_SCALES = {
  demographic: {
    title: "인구학적\n정보",
    description: "Please provide your basic information to help us better understand your needs.",
    icon: "📋",
    category: "Basic Info"
  },
  
  "past-history": {
    title: "과거력\n가족력",
    description: "Please provide information about your medical history.",
    icon: "📝",
    category: "Medical History"
  },
  audit: {
    title: "AUDIT",
    description: "Alcohol Use Disorders Identification Test",
    icon: "🍷",
    category: "Substance Use"
  },
  psqi: {
    title: "PSQI",
    description: "Pittsburgh Sleep Quality Index",
    icon: "😴",
    category: "Sleep Assessment"
  },
   bdi: {
    title: "BDI",
    description: "Beck Depression Inventory",
    icon: "📊",
    category: "Mental Health"
  },
  bai: {
    title: "BAI",
    description: "Beck Anxiety Inventory",
    icon: "🔥",
    category: "Mental Health"
  },
  
  "k-mdq": {
    title: "K-MDQ",
    description: "한국형 조울병 선별검사지",
    icon: "🎭",
    category: "Mental Health"
  }
};

// Elective assessments that patients can choose based on their concerns
const ELECTIVE_SCALES = {
  "oci-r": {
    title: "OCI-R",
    description: "Obsessive-Compulsive Inventory-Revised",
    icon: "🧹",
    category: "Mental Health",
    disease: "강박장애"
  },
};

const RATING_ORDER = [
  'demographic',
  'past-history',
  'audit',
  'psqi',
  'bdi',
  'bai',
  'k-mdq',
];

export default function RatingIndexPage() {
  const router = useRouter();
  const [completedScales, setCompletedScales] = useState<string[]>([]);
  const [nextScale, setNextScale] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // localStorage에서 완료된 목록 불러오기
    const completed = JSON.parse(localStorage.getItem('completedScales') || '[]');
    setCompletedScales(completed);
    // 아직 완료하지 않은 첫 scale 찾기
    const next = RATING_ORDER.find((scale) => !completed.includes(scale));
    setNextScale(next || null);
  }, []);

  const handleStartNext = () => {
    if (nextScale) {
      router.push(`/rating/${nextScale}`);
    }
  };

  const renderScaleCard = (key: string, scale: any, isRequired: boolean = false) => {
    const isCompleted = completedScales.includes(key);
    
    return (
      <Link 
        key={key}
        href={`/rating/${key}`}
        className={`group bg-white rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105 border border-gray-200 overflow-hidden ${
          isCompleted ? 'ring-2 ring-green-500' : ''
        }`}
      >
        <div className="p-6">
          <div className="flex items-start space-x-4">
            <div className="text-4xl flex-shrink-0">
              {scale.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                  {scale.title}
                </h3>
                <div className="flex gap-2">
                  {isCompleted && (
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                      ✓ Completed
                    </span>
                  )}
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    isRequired 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {isRequired ? 'Required' : 'Optional'}
                  </span>
                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                    {scale.category}
                  </span>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">
                {scale.description}
              </p>
              <div className="mt-4 flex items-center text-green-600 font-medium">
                <span>{isCompleted ? 'Review Assessment' : 'Start Assessment'}</span>
                <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Assessment & Rating Scales
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Complete the required assessments first, then choose from additional evaluations based on your specific concerns.
          </p>
          
          {/* Essential Assessment Stepper */}
          <div className="mt-8 mb-12">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">Essential Assessment Progress</h3>
              
              <div className="flex items-center justify-between max-w-4xl mx-auto">
                {Object.entries(REQUIRED_SCALES).map(([key, scale], index) => {
                  const isCompleted = completedScales.includes(key);
                  const isCurrent = nextScale === key && Object.keys(REQUIRED_SCALES).includes(nextScale);
                  const isLast = index === Object.entries(REQUIRED_SCALES).length - 1;
                  
                  return (
                    <div key={key} className="flex items-center">
                      {/* Step Circle */}
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                          isCompleted 
                            ? 'bg-green-500 text-white' 
                            : isCurrent 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-200 text-gray-600'
                        }`}>
                          {isCompleted ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            index + 1
                          )}
                        </div>
                        
                        {/* Step Label */}
                        <div className="mt-2 text-center max-w-24">
                          <p className={`text-xs font-medium ${
                            isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
                          }`} style={{whiteSpace: 'pre-line'}}>
                            {scale.title}
                          </p>
                        </div>
                      </div>
                      
                      {/* Connector Line */}
                      {!isLast && (
                        <div className={`w-16 h-0.5 mx-4 ${
                          isCompleted ? 'bg-green-500' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Continue Assessment Button */}
          <div className="mt-8">
            {nextScale ? (
              <div className="bg-blue-50 rounded-lg p-6 inline-block">
                <button 
                  onClick={handleStartNext}
                  className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium inline-flex items-center text-lg"
                >
                  Continue Assessment ({REQUIRED_SCALES[nextScale as keyof typeof REQUIRED_SCALES]?.title || ELECTIVE_SCALES[nextScale as keyof typeof ELECTIVE_SCALES]?.title})
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="bg-green-50 rounded-lg p-6 inline-block">
                <p className="text-green-700 text-lg">
                  🎉 <strong>All assessments completed!</strong> Thank you for your participation.
                </p>
              </div>
            )}
          </div>
        </div>



        {/* Elective Assessments Section */}
        <div className="mb-12">
          <div className="flex items-center mb-6">
            <div className="flex-shrink-0">
              <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                Optional
              </span>
            </div>
            <div className="ml-4">
              <h2 className="text-2xl font-bold text-gray-900">Additional Evaluations</h2>
              <p className="text-gray-600">Choose assessments based on your specific symptoms or concerns.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(ELECTIVE_SCALES).map(([key, scale]) => 
              renderScaleCard(key, scale, false)
            )}
          </div>

          <div className="mt-6 text-center">
            <div className="bg-gray-50 rounded-lg p-4 inline-block">
              <p className="text-gray-600 text-sm">
                These assessments are optional but can provide valuable insights into specific areas of your mental health.
                <br />
                Feel free to complete them if they relate to your current concerns or symptoms.
              </p>
            </div>
          </div>
        </div>

        {/* Getting Started Section - only show if no assessments completed */}
        {completedScales.length === 0 && (
          <div className="text-center">
            <div className="bg-green-50 rounded-lg p-6 inline-block">
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                Ready to Get Started?
              </h3>
              <p className="text-green-700 mb-4">
                Begin with the required assessments to establish your baseline information.
              </p>
              <Link 
                href="/rating/demographic"
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors font-medium inline-flex items-center"
              >
                Start with Demographics
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 