"use client";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-gray-800">Mindful Path</span>
          </Link>

          {/* Navigation - 환자 로그인 시에만 표시 */}
          {isAuthenticated && user?.type === 'patient' && (
            <nav className="hidden md:flex space-x-8">
              <Link href="/rating" className="text-gray-600 hover:text-gray-900 font-medium">
                자가 평가
              </Link>
              <Link href="/report" className="text-gray-600 hover:text-gray-900 font-medium">
                결과 보기
              </Link>
            </nav>
          )}

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {isAuthenticated && user ? (
              <>
                <span className="text-gray-700 font-medium">
                  {user.type === 'doctor' 
                    ? (user.displayName || user.id.includes('@') 
                        ? user.id.split('@')[0].replace(/[._-]/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                        : user.name.replace(/^Dr\.\s/, ''))
                    : (user.displayName || user.name.replace(/^환자\s/, ''))
                  } 님
                </span>
                <button 
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link 
                  href="/patient-login" 
                  className="bg-green-200 hover:bg-green-300 text-green-800 font-semibold px-4 py-2 rounded-full transition-colors"
                >
                  환자 로그인
                </Link>
                <Link 
                  href="/doctor-login" 
                  className="bg-blue-200 hover:bg-blue-300 text-blue-800 font-semibold px-4 py-2 rounded-full transition-colors"
                >
                  의사 로그인
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 