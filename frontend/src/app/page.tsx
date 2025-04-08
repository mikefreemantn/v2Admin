'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from 'aws-amplify/auth';

// This page simply redirects to the dashboard or login page
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // Check if user is authenticated
        await getCurrentUser();
        // If authenticated, redirect to dashboard
        router.replace('/dashboard');
      } catch (error) {
        // If not authenticated, redirect to login
        console.error('Not authenticated, redirecting to login', error);
        router.replace('/login');
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  // Show a loading indicator while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="mt-2">Redirecting...</p>
      </div>
    </div>
  );
}
