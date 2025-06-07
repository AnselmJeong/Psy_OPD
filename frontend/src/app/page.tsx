"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // 인증 로딩이 완료된 후에 확인
    if (isLoading) return;

    // 의사가 로그인된 상태면 대시보드로 리다이렉트
    if (isAuthenticated && user?.type === 'doctor') {
      router.push('/doctor/dashboard');
    }
  }, [isAuthenticated, user, isLoading, router]);

  // 의사가 로그인된 상태에서는 리다이렉트 중이므로 로딩 표시
  if (isAuthenticated && user?.type === 'doctor') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <>
      
      <div className="bg-gradient-to-b from-green-200 to-white">
        {/* Hero Section */}
        <section className="relative min-h-[500px] flex items-center">
          {/* Background decorative elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute left-8 top-32 w-32 h-32 bg-green-200 rounded-full opacity-20"></div>
            <div className="absolute right-12 top-48 w-24 h-24 bg-pink-200 rounded-full opacity-20"></div>
            <div className="absolute left-24 bottom-32 w-20 h-20 bg-yellow-200 rounded-full opacity-20"></div>
            <div className="absolute right-32 bottom-48 w-28 h-28 bg-blue-200 rounded-full opacity-20"></div>
            
            {/* Tree illustrations - simplified */}
            <div className="absolute left-16 bottom-0 w-16 h-32 bg-green-300 rounded-t-full opacity-30"></div>
            <div className="absolute right-16 bottom-0 w-20 h-36 bg-green-400 rounded-t-full opacity-25"></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-6 leading-20">
              <span className="text-green-700">마음챙김의 길에</span>
              <br />
              오신 것을 환영합니다.
            </h1>
            
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-12 leading-relaxed">
            당신의 정신 건강을 위한 여정이 이곳에서 시작됩니다.<br />저희는 포괄적인 외래 정신과 진료를 제공하며, 개인 맞춤형 치료에 집중합니다.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!(isAuthenticated && user?.type === 'patient') && (
                <Link 
                  href="/patient-login"
                  className="bg-green-200 hover:bg-green-300 text-green-800 font-semibold py-4 px-8 rounded-full transition-colors text-lg"
                >
                  환자 로그인
                </Link>
              )}
              
              {!(isAuthenticated && user?.type === 'patient') && (
                <Link 
                  href="/doctor-login"
                  className="bg-blue-200 hover:bg-blue-300 text-blue-800 font-semibold py-4 px-8 rounded-full transition-colors text-lg"
                >
                  의사 로그인
                </Link>
              )}
            </div>
          </div>
        </section>


        {/* Assessment Section */}
        <section className="py-16 bg-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8">
              처음 방문한 환자를 위한 종합 평가
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-12">
              정확한 진단과 개인화된 치료 계획을 세우기 위해 선별된 평가를 시행합니다.
            </p>
            {isAuthenticated && user?.type === 'patient' ? (
              <Link href="/rating" className="bg-blue-400 hover:bg-blue-600 text-white font-semibold py-4 px-8 rounded-full transition-colors text-lg">
                평가 시작하기
              </Link>
            ) : (
              <Link href="/patient-login" className="bg-blue-400 hover:bg-blue-600 text-white font-semibold py-4 px-8 rounded-full transition-colors text-lg">
                평가 시작하기
              </Link>
            )}

            {/* <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                More assessment tools will be available soon. Each assessment takes approximately 5-15 minutes to complete.
              </p> */}
            {/* </div> */}
          </div>
        </section>

        {/* Services Section */}
        <section className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
            <div className="grid md:grid-cols-3 gap-6">
              {/* Personalized Treatment Plans */}
              <div className="bg-green-100 rounded-2xl p-6 text-center">
                <div className="w-14 h-14 bg-green-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  개인 맞춤형 치료 계획
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  당신의 고유한 정신 건강 요구에 맞게 설계된<br />개인화된 치료 전략.
                </p>
              </div>

              {/* Expert Psychiatric Care */}
              <div className="bg-orange-100 rounded-2xl p-6 text-center">
                <div className="w-14 h-14 bg-orange-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  전문 정신과 치료
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  당신의 건강을 위해 정신건강의학<br />전문의들이 최선을 다하고 있습니다.
                </p>
              </div>

              {/* Ongoing Support */}
              <div className="bg-blue-100 rounded-2xl p-6 text-center">
                <div className="w-14 h-14 bg-blue-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                지속적인 지원 및 후속 조치
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  지속적인 모니터링과 지원을 통해<br />장기적인 성공과 안정성을 보장합니다.
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
