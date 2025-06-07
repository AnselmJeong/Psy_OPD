"use client";
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Modal from '@/components/Modal';
import { setToken, removeToken } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';

export default function PatientLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [currentStep, setCurrentStep] = useState<'login' | 'changePassword'>('login');
  
  // Login form state
  const [medicalRecordNumber, setMedicalRecordNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Password change form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loggedInPatient, setLoggedInPatient] = useState<{ medicalRecordNumber: string } | null>(null);

  // Close modal and go back to home
  const handleCloseModal = () => {
    setIsModalOpen(false);
    router.push('/');
  };

  // Handle login form submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError('');
      // Send credentials to backend for validation and storage
      const response = await fetch('http://localhost:8000/api/v1/auth/patient/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ medicalRecordNumber, password }),
      });
      console.log('Login response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Login failed with status:', response.status, 'and message:', errorText);
        throw new Error(`Login failed: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      if (data.success) {
        // Store logged in patient information in localStorage
        localStorage.setItem('loggedInPatient', JSON.stringify({ medicalRecordNumber }));
        setLoggedInPatient({ medicalRecordNumber });
        
        // Store authentication token
        if (data.token) {
          setToken(data.token, 'patient');
        }

        // Update AuthContext with temporary name (병록번호)
        login({
          id: medicalRecordNumber,
          name: medicalRecordNumber,
          type: 'patient'
        });

        // 로그인 후 실제 이름 가져오기 시도
        try {
          let finalName = medicalRecordNumber; // 기본값: 병록번호
          
          // 먼저 프로필에서 이름 가져오기 시도
          const profileResponse = await fetch(`http://localhost:8000/api/v1/user/${medicalRecordNumber}`, {
            headers: {
              'Authorization': `Bearer ${data.token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            const realName = profileData.demographic_info?.name;
            
            if (realName) {
              finalName = realName;
              console.log('프로필에서 이름을 가져왔습니다:', realName);
            } else {
              // 프로필에 이름이 없으면 demographic 설문에서 가져오기
              try {
                const demographicResponse = await fetch(`http://localhost:8000/api/v1/survey/patient/${medicalRecordNumber}?survey_type=demographic`, {
                  headers: {
                    'Authorization': `Bearer ${data.token}`,
                    'Content-Type': 'application/json',
                  },
                });
                
                if (demographicResponse.ok) {
                  const demographicData = await demographicResponse.json();
                  if (demographicData && demographicData.length > 0) {
                    const latestDemographic = demographicData[0];
                    const demographicName = latestDemographic.responses?.name || 
                                          latestDemographic.responses?.이름 || 
                                          latestDemographic.responses?.환자명;
                    
                    if (demographicName) {
                      finalName = demographicName;
                      console.log('설문에서 이름을 가져왔습니다:', demographicName);
                    }
                  }
                }
              } catch (demographicError) {
                console.log('설문 데이터를 가져올 수 없습니다. 병록번호를 사용합니다.');
              }
            }
          }
          
          // 최종 이름 설정 (실제 이름이 있으면 이름, 없으면 병록번호)
          login({
            id: medicalRecordNumber,
            name: finalName,
            displayName: finalName !== medicalRecordNumber ? finalName : undefined,
            type: 'patient'
          });
          
        } catch (nameError) {
          console.log('실제 이름을 가져올 수 없습니다. 병록번호를 사용합니다:', nameError);
          // 에러가 발생해도 병록번호는 이미 설정되어 있으므로 별도 처리 불필요
        }

        // Check if password is default (8 digits, likely birthdate)
        const isDefaultPassword = /^\d{8}$/.test(password);
        
        if (isDefaultPassword && data.is_default_password !== false) {
          // Show password change form for default passwords
          setCurrentStep('changePassword');
          setCurrentPassword(password); // 현재 입력한 비밀번호를 자동으로 채움
          setError(''); // Clear any previous errors
        } else {
          // Redirect to the requested page or default to /rating
          const redirectTo = searchParams.get('redirect') || '/rating';
          router.push(redirectTo);
        }
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('로그인에 실패했습니다. 병록번호와 비밀번호를 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!loggedInPatient) return;

    setIsLoading(true);
    setError('');

    try {
      // Send password change request to backend
      const response = await fetch('http://localhost:8000/api/v1/patient/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: loggedInPatient.medicalRecordNumber,
          current_password: currentPassword,
          new_password: newPassword
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Password change failed with status:', response.status, 'and message:', errorText);
        throw new Error(`Password change failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      if (result.message === 'Password updated successfully') {
        setIsModalOpen(false);
        const redirectTo = searchParams.get('redirect') || '/rating';
        router.push(redirectTo);
      } else {
        setError(result.message || '비밀번호 변경에 실패했습니다.');
      }
    } catch {
      setError('비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // Skip password change and continue with default password
  const handleSkipPasswordChange = () => {
    if (loggedInPatient) {
      setIsModalOpen(false);
      const redirectTo = searchParams.get('redirect') || '/rating';
      router.push(redirectTo);
    }
  };

  // 로그아웃 핸들러 추가
  const handleLogout = () => {
    // Remove patient information and token from storage
    localStorage.removeItem('loggedInPatient');
    removeToken('patient'); // 토큰도 제거
    setLoggedInPatient(null);
    setIsModalOpen(true);
    setCurrentStep('login');
    setMedicalRecordNumber('');
    setPassword('');
    router.push('/patient-login');
  };

  const renderLoginForm = () => (
    <form onSubmit={handleLogin} className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">환자 로그인</h3>
        <p className="text-sm text-gray-600">
          병록번호와 비밀번호를 입력해주세요.
          <br />
          처음 방문하시는 경우 비밀번호는 생년월일 8자리입니다. (예: 19680430)
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="medicalRecordNumber" className="block text-sm font-medium text-gray-700 mb-2">
          병록번호
        </label>
        <input
          type="text"
          id="medicalRecordNumber"
          value={medicalRecordNumber}
          onChange={(e) => setMedicalRecordNumber(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="예: 2024001"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          비밀번호
        </label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="생년월일 8자리 (예: 19680430)"
          required
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleCloseModal}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '로그인 중...' : '로그인'}
        </button>
      </div>

      <div className="text-center">
        <p className="text-xs text-gray-500">
          테스트용 계정: 2024001 (비밀번호: newpassword123) 또는 2024002 (비밀번호: 19750815)
          <br />
          * 8자리 숫자 비밀번호는 기본 비밀번호로 간주되어 변경을 권장합니다.
        </p>
      </div>
    </form>
  );

  const renderPasswordChangeForm = () => (
    <form onSubmit={handleChangePassword} className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">비밀번호 변경 권장</h3>
        <p className="text-sm text-gray-600">
          기본 비밀번호(생년월일)로 로그인하셨습니다.
          <br />
          보안을 위해 새로운 비밀번호로 변경하는 것을 강력히 권장합니다.
          <br />
          지금 변경하거나 나중에 변경하실 수 있습니다.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
          현재 비밀번호
        </label>
        <input
          type="password"
          id="currentPassword"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="현재 비밀번호를 입력하세요"
          required
        />
      </div>

      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
          새 비밀번호
        </label>
        <input
          type="password"
          id="newPassword"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="6자리 이상 입력해주세요"
          required
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
          새 비밀번호 확인
        </label>
        <input
          type="password"
          id="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="새 비밀번호를 다시 입력해주세요"
          required
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSkipPasswordChange}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          지금은 건너뛰기
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '변경 중...' : '지금 변경하기'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-100">
      {/* 로그아웃 버튼: 로그인된 상태에서만 우측 상단에 노출 */}
      {loggedInPatient && (
        <button
          onClick={handleLogout}
          className="absolute top-4 right-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 z-50"
        >
          로그아웃
        </button>
      )}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={currentStep === 'login' ? '환자 로그인' : '비밀번호 변경 권장'}
      >
        {currentStep === 'login' ? renderLoginForm() : renderPasswordChangeForm()}
      </Modal>
    </div>
  );
} 