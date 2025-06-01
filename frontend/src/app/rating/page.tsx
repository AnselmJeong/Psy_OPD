import Link from "next/link";

// Required assessments that patients should complete
const REQUIRED_SCALES = {
  demographic: {
    title: "Demographic Information",
    description: "Please provide your basic information to help us better understand your needs.",
    icon: "📋",
    category: "Basic Info"
  },
  psqi: {
    title: "Pittsburgh Sleep Quality Index (PSQI)",
    description: "This questionnaire will help us understand your sleep patterns and quality.",
    icon: "😴",
    category: "Sleep Assessment"
  },
  "past-history": {
    title: "Past Medical History",
    description: "Please provide information about your medical history.",
    icon: "📝",
    category: "Medical History"
  }
};

// Elective assessments that patients can choose based on their concerns
const ELECTIVE_SCALES = {
  bdi: {
    title: "Beck Depression Inventory (BDI)",
    description: "This assessment helps evaluate depression symptoms and mood-related concerns.",
    icon: "📊",
    category: "Mental Health"
  },
  bai: {
    title: "Beck Anxiety Inventory (BAI)",
    description: "This assessment helps evaluate anxiety symptoms and related physical sensations.",
    icon: "🔥",
    category: "Mental Health"
  },
  audit: {
    title: "AUDIT (Alcohol Use Disorders Identification Test)",
    description: "This assessment helps identify alcohol use patterns and potential alcohol-related problems.",
    icon: "🍷",
    category: "Substance Use"
  },
  "k-mdq": {
    title: "K-MDQ (한국형 조울병 선별검사지)",
    description: "This assessment helps screen for bipolar disorder and manic episodes.",
    icon: "🎭",
    category: "Mental Health"
  }
};

export default function RatingIndexPage() {
  const renderScaleCard = (key: string, scale: any, isRequired: boolean = false) => (
    <Link 
      key={key}
      href={`/rating/${key}`}
      className="group bg-white rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105 border border-gray-200 overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-start space-x-4">
          <div className="text-4xl flex-shrink-0">
            {scale.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                {scale.title}
              </h3>
              <div className="flex gap-2">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  isRequired 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {isRequired ? 'Required' : 'Optional'}
                </span>
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                  {scale.category}
                </span>
              </div>
            </div>
            <p className="text-gray-600 leading-relaxed">
              {scale.description}
            </p>
            <div className="mt-4 flex items-center text-green-600 font-medium">
              <span>Start Assessment</span>
              <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Assessment & Rating Scales
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Complete the required assessments first, then choose from additional evaluations based on your specific concerns.
          </p>
        </div>

        {/* Required Assessments Section */}
        <div className="mb-16">
          <div className="flex items-center mb-6">
            <div className="flex-shrink-0">
              <span className="bg-red-100 text-red-800 text-sm font-semibold px-3 py-1 rounded-full">
                Required
              </span>
            </div>
            <div className="ml-4">
              <h2 className="text-2xl font-bold text-gray-900">Essential Assessments</h2>
              <p className="text-gray-600">These assessments are required for all patients to ensure comprehensive care.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(REQUIRED_SCALES).map(([key, scale]) => 
              renderScaleCard(key, scale, true)
            )}
          </div>

          <div className="mt-6 text-center">
            <div className="bg-blue-50 rounded-lg p-4 inline-block">
              <p className="text-blue-700 text-sm">
                💡 <strong>Tip:</strong> We recommend starting with Demographic Information, then proceeding to Medical History and Sleep Assessment.
              </p>
            </div>
          </div>
        </div>

        {/* Elective Assessments Section */}
        <div className="mb-12">
          <div className="flex items-center mb-6">
            <div className="flex-shrink-0">
              <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                Optional
              </span>
            </div>
            <div className="ml-4">
              <h2 className="text-2xl font-bold text-gray-900">Additional Evaluations</h2>
              <p className="text-gray-600">Choose assessments based on your specific symptoms or concerns.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(ELECTIVE_SCALES).map(([key, scale]) => 
              renderScaleCard(key, scale, false)
            )}
          </div>

          <div className="mt-6 text-center">
            <div className="bg-gray-50 rounded-lg p-4 inline-block">
              <p className="text-gray-600 text-sm">
                These assessments are optional but can provide valuable insights into specific areas of your mental health.
                <br />
                Feel free to complete them if they relate to your current concerns or symptoms.
              </p>
            </div>
          </div>
        </div>

        {/* Getting Started Section */}
        <div className="text-center">
          <div className="bg-green-50 rounded-lg p-6 inline-block">
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              Ready to Get Started?
            </h3>
            <p className="text-green-700 mb-4">
              Begin with the required assessments to establish your baseline information.
            </p>
            <Link 
              href="/rating/demographic"
              className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors font-medium inline-flex items-center"
            >
              Start with Demographics
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 