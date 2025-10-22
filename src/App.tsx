import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext.tsx";
import AppSettingsProvider from './context/AppSettingsContext';
import ErrorBoundary from './components/ErrorBoundary';
import MainContent from './components/MainContent';

const queryClient = new QueryClient();

const App = () => {
  console.log('App.tsx: Rendering AuthProvider.'); // Added for debugging
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