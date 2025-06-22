import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

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

    console.log('Fetching completed surveys for patient:', patientId);
    console.log('Firebase config check:', {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'set' : 'missing',
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'set' : 'missing',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'set' : 'missing'
    });

    const completedScales: string[] = [];
    
    // Method 1: Try surveys/{patient_id}/{required|elective} structure
    const categories = ['required', 'elective'];
    let surveysFound = false;

    for (const category of categories) {
      try {
        const categoryRef = collection(db, 'surveys', patientId, category);
        const querySnapshot = await getDocs(categoryRef);
        
        // console.log(`Found ${querySnapshot.size} documents in ${category} category for patient ${patientId}`);
        
        if (querySnapshot.size > 0) {
          surveysFound = true;
          querySnapshot.forEach((doc) => {
          const data = doc.data();
          const surveyType = data.survey_type;
          
          // console.log('Raw survey_type from Firebase:', surveyType);
          
          // Map backend survey types to frontend scale names
          let mappedScale: string | null = null;
          if (typeof surveyType === 'string') {
            const upperType = surveyType.toUpperCase();
            const lowerType = surveyType.toLowerCase();
            
            switch (upperType) {
              case 'DEMOGRAPHIC': mappedScale = 'demographic'; break;
              case 'PAST_HISTORY': mappedScale = 'past-history'; break;
              case 'AUDIT': mappedScale = 'audit'; break;
              case 'PSQI': mappedScale = 'psqi'; break;
              case 'BDI': mappedScale = 'bdi'; break;
              case 'BAI': mappedScale = 'bai'; break;
              case 'K-MDQ': mappedScale = 'k-mdq'; break;
              case 'OCI-R': mappedScale = 'oci-r'; break;
              case 'PCL-K-5': mappedScale = 'pcl-k-5'; break;
              case 'GDS-SF': mappedScale = 'gds-sf'; break;
              case 'K-EPDS': mappedScale = 'k-epds'; break;
              case 'PDSS-SR': mappedScale = 'pdss-sr'; break;
              case 'PSWQ': mappedScale = 'pswq'; break;
              default: 
                // Try lowercase mapping for any missed cases
                switch (lowerType) {
                  case 'demographic': mappedScale = 'demographic'; break;
                  case 'past_history': mappedScale = 'past-history'; break;
                  case 'audit': mappedScale = 'audit'; break;
                  case 'psqi': mappedScale = 'psqi'; break;
                  case 'bdi': mappedScale = 'bdi'; break;
                  case 'bai': mappedScale = 'bai'; break;
                  case 'k-mdq': mappedScale = 'k-mdq'; break;
                  case 'oci-r': mappedScale = 'oci-r'; break;
                  case 'pcl-k-5': mappedScale = 'pcl-k-5'; break;
                  case 'gds-sf': mappedScale = 'gds-sf'; break;
                  case 'k-epds': mappedScale = 'k-epds'; break;
                  case 'pdss-sr': mappedScale = 'pdss-sr'; break;
                  case 'pswq': mappedScale = 'pswq'; break;
                  default:
                    mappedScale = lowerType;
                    break;
                }
                break;
            }
          }
          
          // console.log('Mapped scale:', surveyType, '->', mappedScale);
          
          if (mappedScale && !completedScales.includes(mappedScale)) {
            completedScales.push(mappedScale);
          }
        });
        }
      } catch (error) {
        console.warn(`Failed to fetch ${category} surveys:`, error);
        // Continue with other categories even if one fails
      }
    }
    
    // Method 2: If no surveys found in surveys collection, try patients/{patient_id}/surveys
    if (!surveysFound) {
      // console.log('No surveys found in surveys collection, trying patients collection');
      try {
        const patientSurveysRef = collection(db, 'patients', patientId, 'surveys');
        const querySnapshot = await getDocs(patientSurveysRef);
        
        // console.log(`Found ${querySnapshot.size} documents in patients/${patientId}/surveys`);
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const surveyType = data.survey_type;
          
          // console.log('Raw survey_type from patients collection:', surveyType);
          
          // Same mapping logic as before
          let mappedScale: string | null = null;
          if (typeof surveyType === 'string') {
            const upperType = surveyType.toUpperCase();
            const lowerType = surveyType.toLowerCase();
            
            switch (upperType) {
              case 'DEMOGRAPHIC': mappedScale = 'demographic'; break;
              case 'PAST_HISTORY': mappedScale = 'past-history'; break;
              case 'AUDIT': mappedScale = 'audit'; break;
              case 'PSQI': mappedScale = 'psqi'; break;
              case 'BDI': mappedScale = 'bdi'; break;
              case 'BAI': mappedScale = 'bai'; break;
              case 'K-MDQ': mappedScale = 'k-mdq'; break;
              case 'OCI-R': mappedScale = 'oci-r'; break;
              case 'PCL-K-5': mappedScale = 'pcl-k-5'; break;
              case 'GDS-SF': mappedScale = 'gds-sf'; break;
              case 'K-EPDS': mappedScale = 'k-epds'; break;
              case 'PDSS-SR': mappedScale = 'pdss-sr'; break;
              case 'PSWQ': mappedScale = 'pswq'; break;
              default: 
                switch (lowerType) {
                  case 'demographic': mappedScale = 'demographic'; break;
                  case 'past_history': mappedScale = 'past-history'; break;
                  case 'audit': mappedScale = 'audit'; break;
                  case 'psqi': mappedScale = 'psqi'; break;
                  case 'bdi': mappedScale = 'bdi'; break;
                  case 'bai': mappedScale = 'bai'; break;
                  case 'k-mdq': mappedScale = 'k-mdq'; break;
                  case 'oci-r': mappedScale = 'oci-r'; break;
                  case 'pcl-k-5': mappedScale = 'pcl-k-5'; break;
                  case 'gds-sf': mappedScale = 'gds-sf'; break;
                  case 'k-epds': mappedScale = 'k-epds'; break;
                  case 'pdss-sr': mappedScale = 'pdss-sr'; break;
                  case 'pswq': mappedScale = 'pswq'; break;
                  default:
                    mappedScale = lowerType;
                    break;
                }
                break;
            }
          }
          
          // console.log('Mapped scale from patients collection:', surveyType, '->', mappedScale);
          
          if (mappedScale && !completedScales.includes(mappedScale)) {
            completedScales.push(mappedScale);
          }
        });
      } catch (error) {
        console.warn('Failed to fetch surveys from patients collection:', error);
      }
    }

    // console.log('Completed surveys from Firebase:', completedScales);
    return completedScales;
  } catch (error) {
    console.error('Error fetching completed surveys from Firebase:', error);
    throw error;
  }
}

export { auth, db }; 