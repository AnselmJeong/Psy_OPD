"use client";
import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Modal from './Modal';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredAuth?: 'patient' | 'doctor' | 'any';
}

export default function AuthGuard({ children, requiredAuth = 'any' }: AuthGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // 보호된 경로들 정의
  const protectedPatientRoutes = ['/rating', '/demographic'];
  const protectedDoctorRoutes = ['/doctor'];
  const protectedAnyRoutes = ['/report'];

  const isProtectedRoute = useCallback(() => {
    // 홈페이지와 로그인 페이지는 보호하지 않음
    if (pathname === '/' || pathname === '/patient-login' || pathname === '/doctor-login') {
      return false;
    }

    if (requiredAuth === 'patient') {
      return protectedPatientRoutes.some(route => pathname.startsWith(route));
    }
    
    if (requiredAuth === 'doctor') {
      return protectedDoctorRoutes.some(route => pathname.startsWith(route));
    }
    
    // any 타입의 경우 모든 보호된 경로 확인
    return [...protectedPatientRoutes, ...protectedDoctorRoutes, ...protectedAnyRoutes]
      .some(route => pathname.startsWith(route));
  }, [pathname, requiredAuth]);

  useEffect(() => {
    if (isLoading) return;

    const needsAuth = isProtectedRoute();
    
    if (needsAuth && !isAuthenticated) {
      setShowLoginModal(true);
    } else if (needsAuth && isAuthenticated && requiredAuth !== 'any') {
      // 특정 타입의 인증이 필요한 경우 사용자 타입 확인
      if (requiredAuth === 'patient' && user?.type !== 'patient') {
        setShowLoginModal(true);
      } else if (requiredAuth === 'doctor' && user?.type !== 'doctor') {
        setShowLoginModal(true);
      }
    } else {
      setShowLoginModal(false);
    }
  }, [isAuthenticated, isLoading, pathname, user, requiredAuth, isProtectedRoute]);

  const handleCloseModal = () => {
    setShowLoginModal(false);
    router.push('/');
  };

  const handlePatientLogin = () => {
    setShowLoginModal(false);
    router.push(`/patient-login?redirect=${encodeURIComponent(pathname)}`);
  };

  const handleDoctorLogin = () => {
    setShowLoginModal(false);
    router.push(`/doctor-login?redirect=${encodeURIComponent(pathname)}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <>
      {children}
      {showLoginModal && (
        <Modal isOpen={showLoginModal} onClose={handleCloseModal}>
          <div className="text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">로그인이 필요합니다</h3>
              <p className="text-sm text-gray-600 mb-6">
                이 페이지에 접근하기 위해서는 로그인이 필요합니다.
                <br />
                환자 또는 의사 계정으로 로그인해주세요.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handlePatientLogin}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium"
              >
                환자 로그인
              </button>
              <button
                onClick={handleDoctorLogin}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                의사 로그인
              </button>
            </div>

            <div className="mt-4">
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                홈페이지로 돌아가기
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
} 