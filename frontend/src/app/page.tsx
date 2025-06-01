import Link from "next/link";

export default function Home() {
  return (
    <div className="bg-gradient-to-b from-green-50 to-white">
      {/* Hero Section */}
      <section className="relative min-h-[600px] flex items-center">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute left-8 top-32 w-32 h-32 bg-green-200 rounded-full opacity-20"></div>
          <div className="absolute right-12 top-48 w-24 h-24 bg-pink-200 rounded-full opacity-20"></div>
          <div className="absolute left-24 bottom-32 w-20 h-20 bg-yellow-200 rounded-full opacity-20"></div>
          <div className="absolute right-32 bottom-48 w-28 h-28 bg-blue-200 rounded-full opacity-20"></div>
          
          {/* Tree illustrations - simplified */}
          <div className="absolute left-16 bottom-0 w-16 h-32 bg-green-300 rounded-t-full opacity-30"></div>
          <div className="absolute right-16 bottom-0 w-20 h-36 bg-green-400 rounded-t-full opacity-25"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-6">
            Welcome to
            <br />
            <span className="text-green-700">Mindful Path</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-12 leading-relaxed">
            Your journey to mental wellness starts here. We provide comprehensive outpatient psychiatric care, 
            focusing on personalized treatment plans
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/patient-login"
              className="bg-green-200 hover:bg-green-300 text-green-800 font-semibold py-4 px-8 rounded-full transition-colors text-lg"
            >
              Patient Login
            </Link>
            <Link 
              href="/doctor-login"
              className="bg-blue-200 hover:bg-blue-300 text-blue-800 font-semibold py-4 px-8 rounded-full transition-colors text-lg"
            >
              Doctor Login
            </Link>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-12">
            Our Services
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Personalized Treatment Plans */}
            <div className="bg-green-50 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-green-200 rounded-full mx-auto mb-6 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Personalized Treatment Plans
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Customized care strategies designed for your unique mental health needs.
              </p>
            </div>

            {/* Expert Psychiatric Care */}
            <div className="bg-orange-50 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-orange-200 rounded-full mx-auto mb-6 flex items-center justify-center">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Expert Psychiatric Care
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Access to experienced psychiatrists and therapists dedicated to your well-being.
              </p>
            </div>

            {/* Ongoing Support */}
            <div className="bg-blue-50 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-blue-200 rounded-full mx-auto mb-6 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Ongoing Support and Follow-up
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Continuous monitoring and support to ensure long-term success and stability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Assessment Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8">
            Get Started with Your Assessment
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-12">
            Take our comprehensive assessments to help us understand your needs and create a personalized treatment plan.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link 
              href="/rating/demographic"
              className="bg-white hover:bg-gray-50 text-gray-800 font-semibold py-6 px-6 rounded-lg shadow-md transition-all transform hover:scale-105 border border-gray-200"
            >
              <div className="text-center">
                <div className="text-3xl mb-3">📋</div>
                <div className="font-semibold mb-2">Demographic Information</div>
                <div className="text-sm text-gray-500">Basic information form</div>
              </div>
            </Link>
            
            <Link 
              href="/rating/psqi"
              className="bg-white hover:bg-gray-50 text-gray-800 font-semibold py-6 px-6 rounded-lg shadow-md transition-all transform hover:scale-105 border border-gray-200"
            >
              <div className="text-center">
                <div className="text-3xl mb-3">😴</div>
                <div className="font-semibold mb-2">Sleep Quality (PSQI)</div>
                <div className="text-sm text-gray-500">Pittsburgh Sleep Quality Index</div>
              </div>
            </Link>

            <Link 
              href="/rating/bdi"
              className="bg-white hover:bg-gray-50 text-gray-800 font-semibold py-6 px-6 rounded-lg shadow-md transition-all transform hover:scale-105 border border-gray-200"
            >
              <div className="text-center">
                <div className="text-3xl mb-3">📊</div>
                <div className="font-semibold mb-2">Depression (BDI)</div>
                <div className="text-sm text-gray-500">Beck Depression Inventory</div>
              </div>
            </Link>

            <Link 
              href="/rating/past-history"
              className="bg-white hover:bg-gray-50 text-gray-800 font-semibold py-6 px-6 rounded-lg shadow-md transition-all transform hover:scale-105 border border-gray-200"
            >
              <div className="text-center">
                <div className="text-3xl mb-3">📝</div>
                <div className="font-semibold mb-2">Medical History</div>
                <div className="text-sm text-gray-500">Past medical information</div>
              </div>
            </Link>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              More assessment tools will be available soon. Each assessment takes approximately 5-15 minutes to complete.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
