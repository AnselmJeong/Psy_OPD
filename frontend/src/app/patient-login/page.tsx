"use client";
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Modal from '@/components/Modal';
// import { mockAuth, Patient } from '@/lib/mockAuth';
import { signIn } from '@/lib/firebase';
import { setToken } from '@/lib/auth';

export default function PatientLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

        // Redirect to the requested page or default to /rating
        const redirectTo = searchParams.get('redirect') || '/rating';
        router.push(redirectTo);
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
    } catch (error) {
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
        </p>
      </div>
    </form>
  );

  const renderPasswordChangeForm = () => (
    <form onSubmit={handleChangePassword} className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">비밀번호 변경</h3>
        <p className="text-sm text-gray-600">
          보안을 위해 기본 비밀번호를 변경하는 것을 권장합니다.
          <br />
          나중에 변경하거나 지금 건너뛸 수도 있습니다.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

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
          나중에 변경
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '변경 중...' : '비밀번호 변경'}
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
        title={currentStep === 'login' ? '환자 로그인' : '비밀번호 변경'}
      >
        {currentStep === 'login' ? renderLoginForm() : renderPasswordChangeForm()}
      </Modal>
    </div>
  );
} 