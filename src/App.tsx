import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index"; // This is now the splash screen component
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import { useAppSettings } from "./hooks/useAppSettings";
import TopNavBar from "./components/TopNavBar";
import { Button } from "./components/ui/button";
import { AuthProvider } from "@/context/AuthContext.tsx";
import AuthGate from "./components/AuthGate";
import Layout from '@/components/Layout';
import HomePage from '@/pages/HomePage';
import IncidentsPage from '@/pages/IncidentsPage';
import WeatherPage from '@/pages/WeatherPage';
import TrafficPage from '@/pages/TrafficPage';
import ProfilePage from '@/pages/ProfilePage';
import AdminPage from '@/pages/AdminPage';
import PostDetailPage from '@/pages/PostDetailPage';
import React, { useState, useCallback } from 'react'; // Import useState and useCallback

const queryClient = new QueryClient();

// Component to apply app settings and render children
const AppSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  useAppSettings(); // This hook handles setting CSS variables
  return <>{children}</>;
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (showSplash) {
    return <Index onSplashComplete={handleSplashComplete} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <AppSettingsProvider>
              <TopNavBar />
              <div className="tw-min-h-screen tw-flex tw-flex-col tw-bg-background tw-text-foreground tw-pt-16">
                <Routes>
                  {/* Public routes that don't require authentication */}
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/subscribe" element={<SubscriptionPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/terms-of-service" element={<TermsOfServicePage />} />

                  {/* Protected routes wrapped by AuthGate */}
                  <Route element={<AuthGate><Layout /></AuthGate>}>
                    <Route index element={<Navigate to="/home" replace />} /> {/* Redirect root to home if authenticated */}
                    <Route path="home" element={<HomePage />} />
                    <Route path="home/incidents" element={<IncidentsPage />} />
                    <Route path="home/weather" element={<WeatherPage />} />
                    <Route path="home/traffic" element={<TrafficPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="admin" element={<AdminPage />} />
                    <Route path="posts/:postId" element={<PostDetailPage />} />
                  </Route>

                  {/* Catch-all for 404 - ensure it's after all other specific routes */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>

              {/* Floating Feedback Button */}
              <Button
                variant="outline"
                className="tw-fixed tw-bottom-4 tw-right-4 tw-rounded-full tw-shadow-lg tw-button tw-z-50"
                onClick={() => window.open('mailto:support@example.com')}
                aria-label="Send feedback"
              >
                Feedback
              </Button>
            </AppSettingsProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;