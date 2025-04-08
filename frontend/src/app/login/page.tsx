'use client'; // This page needs client-side hooks

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true; // Track if component is mounted

    const checkAuth = async () => {
      try {
        await getCurrentUser();
        // If successful, user is authenticated
        if (isMounted) {
          console.log('Login page: User is already authenticated, redirecting');
          setIsAuthenticated(true);
          router.replace('/'); // Use replace to avoid login page in history
        }
      } catch (error) {
        // Error means user is not authenticated
        if (isMounted) {
          console.log('Login page: User is not authenticated, showing login form');
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Run the auth check
    checkAuth();

    // Cleanup function to prevent state updates if component unmounts
    return () => {
      isMounted = false;
    };
  }, [router]);

  // While checking or if redirecting, show a loader
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated but somehow still on this page, redirect
  if (isAuthenticated) {
    return null;
  }

  // Only render LoginForm if not loading and not authenticated
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      {error && (
        <div className="absolute top-4 right-4 bg-destructive text-destructive-foreground p-4 rounded shadow-lg">
          {error}
          <button 
            className="ml-2 font-bold" 
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}
      <LoginForm />
    </div>
  );
}
