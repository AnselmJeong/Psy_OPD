"use client"; 
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getCompletedSurveys } from "@/lib/firebase";
import { Loader2 } from "lucide-react";
import { 
  REQUIRED_SCALES, 
  ELECTIVE_SCALES, 
  RATING_ORDER,
  type ScaleInfo 
} from "@/constants/scales";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function RatingIndexPage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const [completedScales, setCompletedScales] = useState<string[]>([]);
  const [nextScale, setNextScale] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch completed surveys directly from Firebase
  const fetchCompletedScales = async () => {
    try {
      setLoading(true);
      const patientData = JSON.parse(localStorage.getItem('loggedInPatient') || '{}');
      const patientId = patientData.medicalRecordNumber;
      
      if (!patientId) {
        console.log("No patient logged in, using localStorage fallback");
        // Fallback to localStorage if no patient logged in
        const completed = JSON.parse(localStorage.getItem('completedScales') || '[]');
        setCompletedScales(completed);
        const next = RATING_ORDER.find((scale) => !completed.includes(scale));
        setNextScale(next || null);
        setLoading(false);
        return;
      }

      try {
        // Fetch completed surveys directly from Firebase
        const completedFromFirebase = await getCompletedSurveys(patientId);
        
        console.log('Fetched from Firebase:', completedFromFirebase);
        setCompletedScales(completedFromFirebase);
        
        // Update localStorage for consistency
        localStorage.setItem('completedScales', JSON.stringify(completedFromFirebase));
        
        // Find next scale to complete
        const next = RATING_ORDER.find((scale) => !completedFromFirebase.includes(scale));
        setNextScale(next || null);
        
      } catch (firebaseError) {
        console.error('Failed to fetch from Firebase, using localStorage fallback:', firebaseError);
        // Fallback to localStorage if Firebase fails
        const completed = JSON.parse(localStorage.getItem('completedScales') || '[]');
        setCompletedScales(completed);
        const next = RATING_ORDER.find((scale) => !completed.includes(scale));
        setNextScale(next || null);
      }
    } catch (error) {
      console.error('Error in fetchCompletedScales:', error);
      // Final fallback to localStorage
      const completed = JSON.parse(localStorage.getItem('completedScales') || '[]');
      setCompletedScales(completed);
      const next = RATING_ORDER.find((scale) => !completed.includes(scale));
      setNextScale(next || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // 인증 로딩이 완료된 후에 검사
    if (authLoading) return;

    // 인증되지 않았거나 환자가 아닌 경우 로그인 페이지로 리다이렉트
    if (!isAuthenticated || user?.type !== 'patient') {
      router.push('/patient-login');
      return;
    }
    
    fetchCompletedScales();
  }, [authLoading, isAuthenticated, user, router]);

  const handleStartNext = () => {
    if (nextScale) {
      router.push(`/rating/${nextScale}`);
    }
  };

  // 인증 로딩 중일 때
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const renderScaleCard = (key: string, scale: ScaleInfo, isRequired: boolean = false) => {
    const isCompleted = completedScales.includes(key);
    const linkHref = isCompleted ? `/report/${key}` : `/rating/${key}`;
    
    return (
      <Link 
        key={key}
        href={linkHref}
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
                    {isRequired ? '필수' : '선택'}
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
                <span>{isCompleted ? '평가 결과 확인' : '평가 시작'}</span>
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
            평가 및 평가도구
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            필수 평가항목을 먼저 수행하시고, 관심있거나 우려하는 증상, 질병에 근거하여<br/>추가로 평가하고 싶은 평가도구를 선택하세요.
          </p>
          
          {/* Essential Assessment Stepper */}
          <div className="mt-8 mb-12">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">필수 평가항목 수행 현황</h3>
              
              <div className="flex items-center justify-between max-w-4xl mx-auto">
                {Object.entries(REQUIRED_SCALES).map(([key, scale], index) => {
                  const isCompleted = completedScales.includes(key);
                  const isCurrent = nextScale === key && Object.keys(REQUIRED_SCALES).includes(nextScale);
                  const isLast = index === Object.entries(REQUIRED_SCALES).length - 1;
                  
                  return (
                    <div key={key} className="flex items-center">
                      {/* Step Circle */}
                      <div className="flex flex-col items-center">
                        {isCompleted ? (
                          <Link href={`/report/${key}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors cursor-pointer hover:bg-green-600 ${
                              isCompleted 
                                ? 'bg-green-500 text-white' 
                                : isCurrent 
                                  ? 'bg-blue-500 text-white' 
                                  : 'bg-gray-200 text-gray-600'
                            }`}>
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </Link>
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                            isCompleted 
                              ? 'bg-green-500 text-white' 
                              : isCurrent 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-200 text-gray-600'
                          }`}>
                            {index + 1}
                          </div>
                        )}
                        
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
                  🎉 <strong>모든 평가가 완료되었습니다!</strong>
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
                선택사항
              </span>
            </div>
            <div className="ml-4">
              <h2 className="text-2xl font-bold text-gray-900">추가적 평가들</h2>
              <p className="text-gray-600">관심있거나 우려하는 증상, 질병에 근거하여 관련된 평가도구를 선택하세요.</p>
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
                위 평가도구들은 선택사항이지만, 특정 증상, 질병에 대한 깊은 이해를 제공할 수 있습니다.
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