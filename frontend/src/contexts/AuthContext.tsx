"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  name: string;
  displayName?: string;
  type: 'patient' | 'doctor';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  updateUserName: (displayName: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const fetchUserDisplayName = async (userId: string, userType: 'patient' | 'doctor'): Promise<string | null> => {
  try {
    console.log(`[AuthContext] Fetching display name for ${userType}: ${userId}`);
    
    const token = userType === 'patient' 
      ? localStorage.getItem('patient_token')
      : localStorage.getItem('clinician_token');
      
    console.log(`[AuthContext] Token found: ${token ? 'Yes' : 'No'}`);
    if (!token) return null;

    if (userType === 'patient') {
      // 환자의 경우 자신의 프로필 정보에서 이름 가져오기
      try {
        const profileUrl = `http://localhost:8000/api/v1/user/${userId}`;
        console.log(`[AuthContext] Calling patient profile API: ${profileUrl}`);
        
        const profileResponse = await fetch(profileUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        console.log(`[AuthContext] Profile API response status: ${profileResponse.status}`);
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          console.log(`[AuthContext] Profile API data:`, profileData);
          
          const displayName = profileData.demographic_info?.name;
          if (displayName) {
            console.log(`[AuthContext] Found patient name from profile: ${displayName}`);
            return displayName;
          }
        }
      } catch (profileError) {
        console.log(`[AuthContext] Profile API failed, trying demographic survey`);
      }
      
      // 대체방법: demographic 설문에서 이름 가져오기
      try {
        const demographicUrl = `http://localhost:8000/api/v1/survey/patient/${userId}?survey_type=demographic`;
        console.log(`[AuthContext] Calling demographic survey API: ${demographicUrl}`);
        
        const demographicResponse = await fetch(demographicUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        console.log(`[AuthContext] Demographic API response status: ${demographicResponse.status}`);
        
        if (demographicResponse.ok) {
          const demographicData = await demographicResponse.json();
          console.log(`[AuthContext] Demographic API data:`, demographicData);
          
          if (demographicData && demographicData.length > 0) {
            const latestDemographic = demographicData[0]; // 가장 최근 데이터
            const displayName = latestDemographic.responses?.name || 
                              latestDemographic.responses?.이름 || 
                              latestDemographic.responses?.환자명;
            
            if (displayName) {
              console.log(`[AuthContext] Found patient name from demographic: ${displayName}`);
              return displayName;
            }
          }
        }
             } catch (demographicError) {
         console.log(`[AuthContext] Demographic API failed:`, demographicError);
       }
       
       // 모든 방법으로 이름을 가져오지 못한 경우
       console.log(`[AuthContext] 환자 ${userId}의 이름을 찾을 수 없습니다. 병록번호를 사용합니다.`);
       return null; // null을 반환하면 호출하는 곳에서 병록번호를 사용
    } else {
      // 의사의 경우 프로필 API에서 이름 가져오기 시도
      const url = `http://localhost:8000/api/v1/user/${userId}`;
      console.log(`[AuthContext] Calling doctor API: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`[AuthContext] Doctor API response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[AuthContext] Doctor API data:`, data);
        const displayName = data.demographic_info?.name || null;
        console.log(`[AuthContext] Extracted doctor name: ${displayName}`);
        if (displayName) {
          return displayName;
        }
      }
      
      // 프로필에서 이름을 찾을 수 없는 경우, 이메일에서 이름 부분 추출
      if (userId.includes('@')) {
        const emailName = userId.split('@')[0];
        // 이메일의 로컬 부분을 더 읽기 쉽게 변환
        const formattedName = emailName
          .replace(/[._-]/g, ' ')  // 점, 언더스코어, 하이픈을 공백으로
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))  // 각 단어 첫글자 대문자
          .join(' ');
        console.log(`[AuthContext] Extracted name from email: ${formattedName}`);
        return formattedName;
      }
    }
  } catch (error) {
    console.error('[AuthContext] Error fetching display name:', error);
  }
  return null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const loggedInPatient = localStorage.getItem('loggedInPatient');
        const loggedInDoctor = localStorage.getItem('loggedInDoctor');

        if (loggedInPatient) {
          const patientData = JSON.parse(loggedInPatient);
          const userId = patientData.medicalRecordNumber;
          
          const displayName = await fetchUserDisplayName(userId, 'patient');
          
          setUser({
            id: userId,
            name: displayName || userId, // 이름이 없으면 병록번호 사용
            displayName: displayName || undefined,
            type: 'patient'
          });
        } else if (loggedInDoctor) {
          const doctorData = JSON.parse(loggedInDoctor);
          const userId = doctorData.doctorId;
          
          const displayName = await fetchUserDisplayName(userId, 'doctor');
          
          setUser({
            id: userId,
            name: displayName || `Dr. ${userId}`,
            displayName: displayName || undefined,
            type: 'doctor'
          });
        }
      } catch (error) {
        console.error('인증 상태 확인 중 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
  };

  const updateUserName = (displayName: string) => {
    if (user) {
      setUser({
        ...user,
        name: displayName,
        displayName: displayName
      });
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('loggedInPatient');
    localStorage.removeItem('loggedInDoctor');
    localStorage.removeItem('patient_token');
    localStorage.removeItem('clinician_token');
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    updateUserName,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 