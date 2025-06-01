"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import { mockAuth, Patient } from '@/lib/mockAuth';

export default function PatientLoginPage() {
  const router = useRouter();
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
  const [loggedInPatient, setLoggedInPatient] = useState<Patient | null>(null);

  // Close modal and go back to home
  const handleCloseModal = () => {
    setIsModalOpen(false);
    router.push('/');
  };

  // Handle login form submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await mockAuth.login(medicalRecordNumber, password);
      
      if (result.success && result.patient) {
        setLoggedInPatient(result.patient);
        
        if (result.requiresPasswordChange) {
          // Show password change form
          setCurrentPassword(password);
          setCurrentStep('changePassword');
        } else {
          // Login successful, set session and redirect
          mockAuth.setCurrentPatient(result.patient);
          setIsModalOpen(false);
          router.push('/rating/demographic');
        }
      } else {
        setError(result.message || '로그인에 실패했습니다.');
      }
    } catch (error) {
      setError('로그인 중 오류가 발생했습니다.');
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
      const result = await mockAuth.changePassword(
        loggedInPatient.medicalRecordNumber,
        currentPassword,
        newPassword
      );

      if (result.success) {
        // Password changed successfully, set session and redirect
        mockAuth.setCurrentPatient(loggedInPatient);
        setIsModalOpen(false);
        router.push('/rating/demographic');
      } else {
        setError(result.message);
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
      mockAuth.setCurrentPatient(loggedInPatient);
      setIsModalOpen(false);
      router.push('/rating/demographic');
    }
  };

  // Check if already logged in
  useEffect(() => {
    if (mockAuth.isLoggedIn()) {
      router.push('/rating/demographic');
    }
  }, [router]);

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Mindful Path"
        size="md"
      >
        {currentStep === 'login' ? renderLoginForm() : renderPasswordChangeForm()}
      </Modal>
    </div>
  );
} 