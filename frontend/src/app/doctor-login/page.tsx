"use client";
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Modal from '@/components/Modal';
import { setToken } from '@/lib/auth';

export default function DoctorLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [currentStep, setCurrentStep] = useState<'login' | 'changePassword'>('login');
  
  // Login form state
  const [doctorId, setDoctorId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Password change form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loggedInDoctor, setLoggedInDoctor] = useState<{ doctorId: string } | null>(null);

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
      
      // Send credentials to backend for validation
      const response = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          user_id: doctorId, 
          password: password,
          user_type: "clinician"
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Login failed with status:', response.status, 'and message:', errorText);
        throw new Error(`Login failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (data.token) {
        // Store logged in doctor information in localStorage
        localStorage.setItem('loggedInDoctor', JSON.stringify({ doctorId }));
        setLoggedInDoctor({ doctorId });
        
        // Store authentication token
        setToken(data.token, 'clinician');

        // Redirect to the requested page or default to /doctor/dashboard
        const redirectTo = searchParams.get('redirect') || '/doctor/dashboard';
        router.push(redirectTo);
      } else {
        setError('로그인에 실패했습니다. 의사 ID와 비밀번호를 확인해주세요.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('로그인에 실패했습니다. 의사 ID와 비밀번호를 확인해주세요.');
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

    if (!loggedInDoctor) return;

    setIsLoading(true);
    setError('');

    try {
      // Send password change request to backend
      const response = await fetch('http://localhost:8000/api/v1/doctor/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doctor_id: loggedInDoctor.doctorId,
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
        const redirectTo = searchParams.get('redirect') || '/doctor/dashboard';
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

  // Skip password change and continue
  const handleSkipPasswordChange = () => {
    if (loggedInDoctor) {
      setIsModalOpen(false);
      const redirectTo = searchParams.get('redirect') || '/doctor/dashboard';
      router.push(redirectTo);
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('loggedInDoctor');
    setLoggedInDoctor(null);
    setIsModalOpen(true);
    setCurrentStep('login');
    setDoctorId('');
    setPassword('');
    router.push('/doctor-login');
  };

  const renderLoginForm = () => (
    <form onSubmit={handleLogin} className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">의사 로그인</h3>
        <p className="text-sm text-gray-600">
          의사 ID와 비밀번호를 입력해주세요.
          <br />
          보안을 위해 비밀번호는 정기적으로 변경해주시기 바랍니다.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="doctorId" className="block text-sm font-medium text-gray-700 mb-2">
          의사 ID
        </label>
        <input
          type="text"
          id="doctorId"
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="의사 ID를 입력하세요"
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="비밀번호를 입력하세요"
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
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '로그인 중...' : '로그인'}
        </button>
      </div>
    </form>
  );

  const renderPasswordChangeForm = () => (
    <form onSubmit={handleChangePassword} className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">비밀번호 변경</h3>
        <p className="text-sm text-gray-600">
          보안을 위해 비밀번호를 변경해주세요.
          <br />
          비밀번호는 8자 이상이며, 영문, 숫자, 특수문자를 포함해야 합니다.
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="8자 이상, 영문, 숫자, 특수문자 포함"
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="새 비밀번호를 다시 입력하세요"
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
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '변경 중...' : '비밀번호 변경'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-100">
      {/* Logout button: only visible when logged in */}
      {loggedInDoctor && (
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
        title={currentStep === 'login' ? '의사 로그인' : '비밀번호 변경'}
      >
        {currentStep === 'login' ? renderLoginForm() : renderPasswordChangeForm()}
      </Modal>
    </div>
  );
} 