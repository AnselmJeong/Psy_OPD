"use client";
// components/Survey.tsx

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DemographicRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new dynamic route
    router.replace('/rating/demographic');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Redirecting...</p>
        </div>
      </div>
    </div>
  );
} 