"use client";

import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext.tsx';
import { useAppSettings } from '@/hooks/useAppSettings';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Index from '@/pages/Index'; // Direct Import
import { Loader2 } from 'lucide-react'; // For a simple fallback

// Helper function to ensure default export is used for lazy loading and log errors
const lazyLoad = (factory: () => Promise<any>, path: string) => {
  console.log(`[LAZY] Defining: ${path}`);
  const LazyComponent = React.lazy(() => factory().then(module => {
    if (!module.default) {
      console.error(`CRITICAL ERROR: Missing default export in ${path}`, module);
      throw new Error(`Missing default export in ${path}`);
    }
    console.log(`[LAZY] SUCCESS: ${path} loaded`);
    return { default: module.default };
  }).catch(err => {
    console.error(`[LAZY] FAILED: ${path}`, err);
    throw err;
  }));
  
  return LazyComponent;
};

// Define a common loading fallback for pages
const PageLoadingFallback = () => (
  <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
    <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" aria-label="Loading page" />
    <p className="tw-ml-2">Loading page...</p>
  </div>
);

// Lazy load only AuthPage for testing
const AuthPage = lazyLoad(() => import('@/pages/AuthPage'), '@/pages/AuthPage');
// const HomePage = lazyLoad(() => import('@/pages/HomePage'), '@/pages/HomePage');
// ... (all others commented out)

const MainContent: React.FC = () => {
  useAuth(); 
  useAppSettings();

  return (
    <>
      <div className="tw-min-h-screen tw-bg-background tw-text-foreground">
        <Routes>
          {/* Direct Import */}
          <Route path="/" element={<Index />} /> 

          {/* Test Route 1: AuthPage */}
          <Route path="/auth" element={<Suspense fallback={<PageLoadingFallback />}><AuthPage /></Suspense>} />
          
          {/* All other routes commented out */}
          {/* <Route path="/auth/login" element={<Suspense fallback={<PageLoadingFallback />}><LoginPage /></Suspense>} /> */}
          {/* ... */}
          
          {/* Catch-all for 404 */}
          {/* <Route path="*" element={<Suspense fallback={<PageLoadingFallback />}><NotFound /></Suspense>} /> */}
        </Routes>
      </div>
    </>
  );
};

export default MainContent;