import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom"; // Removed Navigate, Outlet
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import { useAppSettings } from "./hooks/useAppSettings";
import TopNavBar from "./components/TopNavBar";
import { Button } from "./components/ui/button";
import { AuthProvider } from "@/context/AuthContext.tsx";
import AuthGate from "./components/AuthGate"; // Import AuthGate

const queryClient = new QueryClient();

// Component to apply app settings and render children
const AppSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  useAppSettings(); // This hook handles setting CSS variables
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <AppSettingsProvider>
            <TopNavBar />
            <div className="tw-min-h-screen tw-flex tw-flex-col tw-bg-background tw-text-foreground tw-pt-16">
              <Routes>
                {/* The root path renders Index, which then renders AuthGate via Outlet */}
                <Route path="/" element={<Index />}>
                  <Route index element={<AuthGate />} /> {/* AuthGate as the default child of Index */}
                  <Route path="*" element={<AuthGate />} /> {/* AuthGate handles all paths under / */}
                </Route>

                {/* Public routes */}
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/subscribe" element={<SubscriptionPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/terms-of-service" element={<TermsOfServicePage />} />

                {/* Catch-all route for 404 - ensure it's after all other specific routes */}
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

export default App;