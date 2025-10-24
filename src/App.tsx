import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext.tsx";
import AppSettingsProvider from './context/AppSettingsContext';
import ErrorBoundary from './components/ErrorBoundary';
import MainContent from './components/MainContent';
// Removed import for supabase client as it's no longer used here

const queryClient = new QueryClient();

const App = () => {
  console.log('App.tsx: Rendering AuthProvider.');
  // TEMPORARY: Clear local storage and force Supabase logout to ensure a fresh state for debugging
  // localStorage.clear(); 
  // console.log('App.tsx: localStorage cleared for debugging purposes.');

  // Also force a Supabase logout to clear any session cookies/internal storage
  // This is a temporary measure for debugging.
  // Note: signOut is async, but we don't need to await it here to avoid blocking render.
  // supabase.auth.signOut().then(() => {
  //   console.log('App.tsx: Forced Supabase signOut for debugging.');
  // }).catch(err => {
  //   console.error('App.tsx: Error during forced Supabase signOut:', err);
  // });

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
              <AppSettingsProvider>
                {/* Render MainContent which contains all routes */}
                <MainContent />
              </AppSettingsProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;