// Session storage keys
const PATIENT_TOKEN_KEY = 'patient_token';
const CLINICIAN_TOKEN_KEY = 'clinician_token';

// Token types
export type TokenType = 'patient' | 'clinician';

// Session management functions
export const setToken = (token: string, type: TokenType) => {
  const key = type === 'patient' ? PATIENT_TOKEN_KEY : CLINICIAN_TOKEN_KEY;
  localStorage.setItem(key, token);
};

export const getToken = (type: TokenType): string | null => {
  const key = type === 'patient' ? PATIENT_TOKEN_KEY : CLINICIAN_TOKEN_KEY;
  return localStorage.getItem(key);
};

export const removeToken = (type: TokenType) => {
  const key = type === 'patient' ? PATIENT_TOKEN_KEY : CLINICIAN_TOKEN_KEY;
  localStorage.removeItem(key);
};

export const isAuthenticated = (type: TokenType): boolean => {
  return !!getToken(type);
};

// API request helper with authentication
export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {},
  type: TokenType
) => {
  const token = getToken(type);
  if (!token) {
    throw new Error('인증이 필요합니다.');
  }

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeToken(type);
    throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
  }

  return response;
}; 