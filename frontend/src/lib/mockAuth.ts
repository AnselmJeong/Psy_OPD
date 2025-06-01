// Mock authentication functions for development

export interface Patient {
  id: string;
  medicalRecordNumber: string;
  name?: string;
  birthDate?: string;
  isFirstLogin: boolean;
  lastLogin?: Date;
}

// Mock database - in real app this would be in a database
const mockPatients: Record<string, Patient> = {
  "2024001": {
    id: "2024001",
    medicalRecordNumber: "2024001",
    name: "김환자",
    birthDate: "19680430",
    isFirstLogin: false,
    lastLogin: new Date("2024-01-15")
  },
  "2024002": {
    id: "2024002", 
    medicalRecordNumber: "2024002",
    name: "이환자",
    birthDate: "19750815",
    isFirstLogin: true
  }
};

// Mock passwords - in real app this would be hashed and stored securely
const mockPasswords: Record<string, string> = {
  "2024001": "newpassword123", // Changed password
  "2024002": "19750815" // Default birth date password
};

export const mockAuth = {
  // Login function
  async login(medicalRecordNumber: string, password: string): Promise<{
    success: boolean;
    patient?: Patient;
    message?: string;
    requiresPasswordChange?: boolean;
  }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if patient exists or auto-register
    let patient = mockPatients[medicalRecordNumber];
    
    if (!patient) {
      // Auto-register new patient with medical record number
      patient = {
        id: medicalRecordNumber,
        medicalRecordNumber,
        isFirstLogin: true
      };
      mockPatients[medicalRecordNumber] = patient;
      mockPasswords[medicalRecordNumber] = password; // Set initial password
    }

    // Check password
    const storedPassword = mockPasswords[medicalRecordNumber];
    if (storedPassword !== password) {
      return {
        success: false,
        message: "병록번호 또는 비밀번호가 올바르지 않습니다."
      };
    }

    // Check if it's first login with birth date password
    const isDefaultPassword = /^\d{8}$/.test(password); // Birth date format YYYYMMDD
    const requiresPasswordChange = patient.isFirstLogin && isDefaultPassword;

    // Update last login
    patient.lastLogin = new Date();

    return {
      success: true,
      patient,
      requiresPasswordChange,
      message: "로그인 성공"
    };
  },

  // Change password function
  async changePassword(medicalRecordNumber: string, currentPassword: string, newPassword: string): Promise<{
    success: boolean;
    message: string;
  }> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const storedPassword = mockPasswords[medicalRecordNumber];
    if (storedPassword !== currentPassword) {
      return {
        success: false,
        message: "현재 비밀번호가 올바르지 않습니다."
      };
    }

    if (newPassword.length < 6) {
      return {
        success: false,
        message: "새 비밀번호는 6자리 이상이어야 합니다."
      };
    }

    // Update password and mark as not first login
    mockPasswords[medicalRecordNumber] = newPassword;
    if (mockPatients[medicalRecordNumber]) {
      mockPatients[medicalRecordNumber].isFirstLogin = false;
    }

    return {
      success: true,
      message: "비밀번호가 성공적으로 변경되었습니다."
    };
  },

  // Get current patient from session (mock)
  getCurrentPatient(): Patient | null {
    const stored = localStorage.getItem('currentPatient');
    return stored ? JSON.parse(stored) : null;
  },

  // Set current patient session (mock)
  setCurrentPatient(patient: Patient): void {
    localStorage.setItem('currentPatient', JSON.stringify(patient));
  },

  // Logout
  logout(): void {
    localStorage.removeItem('currentPatient');
  },

  // Check if logged in
  isLoggedIn(): boolean {
    return this.getCurrentPatient() !== null;
  }
}; 