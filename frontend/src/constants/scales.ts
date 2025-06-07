// Scale types and interfaces
export interface ScaleInfo {
  title: string;
  description: string;
  icon: string;
  category: string;
}

export interface ScaleConfig {
  title: string;
  file: string;
  description: string;
}

// Required assessments that patients should complete
export const REQUIRED_SCALES: Record<string, ScaleInfo> = {
  demographic: {
    title: "인구학적\n정보",
    description: "저희가 환자분의 필요를 더 잘 이해할 수 있도록 기본적인 정보를 제공해 주십시오.",
    icon: "📋",
    category: "기본 정보"
  },
  
  "past-history": {
    title: "과거력\n가족력",
    description: "당신의 정신과적 과거력과 가족력을 제공해 주십시오.",
    icon: "📝",
    category: "과거력, 가족력"
  },
  audit: {
    title: "AUDIT",
    description: "음주 사용 장애 식별 검사",
    icon: "🍷",
    category: "음주 사용 장애"
  },
  psqi: {
    title: "PSQI",
    description: "피츠버그 수면 질 지수",
    icon: "😴",
    category: "수면 장애"
  },
   bdi: {
    title: "BDI",
    description: "벡 우울 검사지",
    icon: "📊",
    category: "우울증"
  },
  bai: {
    title: "BAI",
    description: "벡 불안 검사지",
    icon: "🔥",
    category: "불안장애"
  },
  
  "k-mdq": {
    title: "K-MDQ",
    description: "한국형 조울병 선별검사지",
    icon: "🎭",
    category: "양극성 장애"
  }
};

// Elective assessments that patients can choose based on their concerns
export const ELECTIVE_SCALES: Record<string, ScaleInfo> = {
  "oci-r": {
    title: "OCI-R",
    description: "강박행동 질문지",
    icon: "🧹",
    category: "강박장애"
  },
  "k-epds": {
    title: "K-EPDS",
    description: "한국형 산후우울증 선별검사지",
    icon: "👶",
    category: "산후우울증"
  },
  "gds-sf": {
    title: "GDS-SF",
    description: "한국형 노인우울척도 단축형",
    icon: "👴",
    category: "노인우울증"
  },
  "pdss-sr": {
    title: "PDSS-SR",
    description: "한국형 공황증 선별검사지",
    icon: "🔥",
    category: "공황장애"
  },
  "pcl-k-5": {
    title: "PCL-K-5",
    description: "외상 후 스트레스 장애 체크리스트-5",
    icon: "💥",
    category: "외상 후 스트레스 장애"
  },
  "pswq": {
    title: "PSWQ",
    description: "펜실베니아 걱정 질문지",
    icon: "💭",
    category: "불안장애"
  }
};

// Rating order for required assessments
export const RATING_ORDER = [
  'demographic',
  'past-history',
  'audit',
  'psqi',
  'bdi',
  'bai',
  'k-mdq',
];

// Combined available scales for rating form configuration
export const AVAILABLE_SCALES: Record<string, ScaleConfig> = {
  demographic: {
    title: "Demographic Information",
    file: "demographic.json",
    description: "Basic demographic information"
  },
  "past-history": {
    title: "Past & Family History",
    file: "past-history.json", 
    description: "Mental health history"
  },
  audit: {
    title: "AUDIT",
    file: "audit.json",
    description: "Alcohol Use Disorders Identification Test"
  },
  psqi: {
    title: "PSQI",
    file: "psqi.json",
    description: "Pittsburgh Sleep Quality Index"
  },
  bdi: {
    title: "BDI",
    file: "bdi.json",
    description: "Beck Depression Inventory"
  },
  bai: {
    title: "BAI", 
    file: "bai.json",
    description: "Beck Anxiety Inventory"
  },
  "k-mdq": {
    title: "K-MDQ",
    file: "k-mdq.json",
    description: "Korean Mood Disorder Questionnaire"
  },
  "oci-r": {
    title: "OCI-R",
    file: "oci-r.json",
    description: "Obsessive-Compulsive Inventory-Revised"
  },
  "k-epds": {
    title: "K-EPDS",
    file: "k-epds.json",
    description: "Korean Edinburgh Postnatal Depression Scale"
  },
  "gds-sf": {
    title: "GDS-SF",
    file: "gds-sf.json",
    description: "Geriatric Depression Scale-Short Form"
  },
  "pdss-sr": {
    title: "PDSS-SR",
    file: "pdss-sr.json", 
    description: "Panic Disorder Severity Scale-Self Report"
  },
  "pcl-k-5": {
    title: "PCL-K-5",
    file: "pcl-k-5.json",
    description: "PTSD Checklist for DSM-5"
  },
  "pswq": {
    title: "PSWQ",
    file: "pswq.json",
    description: "Penn State Worry Questionnaire"
  }
};

// Scale list for doctor dashboard (simplified format)
export const DASHBOARD_SCALES = [
  'demographic',
  'past-history', 
  'audit',
  'psqi',
  'bdi',
  'bai',
  'k-mdq',
  'oci-r',
  'k-epds', 
  'gds-sf',
  'pdss-sr',
  'pcl-k-5',
  'pswq'
];

// Helper functions
export const getAllScales = () => ({ ...REQUIRED_SCALES, ...ELECTIVE_SCALES });

export const getScaleInfo = (scaleKey: string): ScaleInfo | undefined => {
  return getAllScales()[scaleKey];
};

export const getScaleConfig = (scaleKey: string): ScaleConfig | undefined => {
  return AVAILABLE_SCALES[scaleKey];
};

export const isRequiredScale = (scaleKey: string): boolean => {
  return scaleKey in REQUIRED_SCALES;
};

export const isElectiveScale = (scaleKey: string): boolean => {
  return scaleKey in ELECTIVE_SCALES;
}; 