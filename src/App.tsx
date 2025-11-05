console.log('App.tsx: Loaded');
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext.tsx";
import AppSettingsProvider from './context/AppSettingsContext';
import ErrorBoundary from './components/ErrorBoundary';
import MainContent from './components/MainContent';
import ChunkErrorHandler from './components/ChunkErrorHandler'; // Import ChunkErrorHandler

const queryClient = new QueryClient();

// Defensive check for local imports
if (!ErrorBoundary) throw new Error("ErrorBoundary is undefined");
if (!ChunkErrorHandler) throw new Error("ChunkErrorHandler is undefined");
if (!AppSettingsProvider) throw new Error("AppSettingsProvider is undefined");
if (!AuthProvider) throw new Error("AuthProvider is undefined");
if (!MainContent) throw new Error("MainContent is undefined");

const App = () => {
  console.log('App.tsx: Rendering');
  
  // CRITICAL DEBUG LOG: Check if any component is undefined
  if (import.meta.env.DEV) {
    console.log('App.tsx Component Check:', {
      Sonner, 
      TooltipProvider, 
      AuthProvider, 
      AppSettingsProvider, 
      ErrorBoundary, 
      MainContent, 
      ChunkErrorHandler
    });
  }

  return (
    <ErrorBoundary>
      <ChunkErrorHandler>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            {/* <Sonner /> <-- Temporarily removed */}
            <BrowserRouter>
              <AuthProvider>
                <AppSettingsProvider>
                  {/* Render MainContent which contains all routes */}
                  <MainContent />
                </AppSettingsProvider>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </ChunkErrorHandler>
    </ErrorBoundary>
  );
};

export default App;