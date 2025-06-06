import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc } from 'firebase/firestore';

// Firebase configuration - 하드코딩으로 강제 설정
const firebaseConfig = {
  apiKey: "AIzaSyAzFcoXyheI1h_X0WyO14G9s90PKnZ8wyg",
  authDomain: "psy-opd.firebaseapp.com",
  projectId: "psy-opd",
  storageBucket: "psy-opd.firebasestorage.app",
  messagingSenderId: "976520764826",
  appId: "1:976520764826:web:800d717126884f90b8ae23"
};

// Debug logging
console.log('Firebase Config Debug (Hardcoded):', {
  projectId: firebaseConfig.projectId,
  apiKeyPrefix: firebaseConfig.apiKey?.substring(0, 10) + '...',
  authDomain: firebaseConfig.authDomain
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Function to get the current user's token
export async function getCurrentUserToken(): Promise<string | null> {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        resolve(token);
      } else {
        resolve(null);
      }
    });
  });
}

// Function to sign in a user
export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

// Function to fetch completed surveys directly from Firestore
export async function getCompletedSurveys(patientId: string): Promise<string[]> {
  try {
    if (!patientId) {
      throw new Error('Patient ID is required');
    }

    const completedScales: string[] = [];
    const categories = ['required', 'elective'];

    for (const category of categories) {
      try {
        const categoryRef = collection(db, 'surveys', patientId, category);
        const querySnapshot = await getDocs(categoryRef);
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const surveyType = data.survey_type?.toLowerCase();
          
          // Map backend survey types to frontend scale names
          let mappedScale: string | null = null;
          switch (surveyType) {
            case 'demographic': mappedScale = 'demographic'; break;
            case 'past_history': mappedScale = 'past-history'; break;
            case 'audit': mappedScale = 'audit'; break;
            case 'psqi': mappedScale = 'psqi'; break;
            case 'bdi': mappedScale = 'bdi'; break;
            case 'bai': mappedScale = 'bai'; break;
            case 'k-mdq': mappedScale = 'k-mdq'; break;
            case 'oci-r': mappedScale = 'oci-r'; break;
            default: 
              if (typeof surveyType === 'string') {
                mappedScale = surveyType;
              }
              break;
          }
          
          if (mappedScale && !completedScales.includes(mappedScale)) {
            completedScales.push(mappedScale);
          }
        });
      } catch (error) {
        console.warn(`Failed to fetch ${category} surveys:`, error);
        // Continue with other categories even if one fails
      }
    }

    console.log('Completed surveys from Firebase:', completedScales);
    return completedScales;
  } catch (error) {
    console.error('Error fetching completed surveys from Firebase:', error);
    throw error;
  }
}

export { auth, db }; 