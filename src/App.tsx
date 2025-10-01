import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import PostDetailPage from "./pages/PostDetailPage";
import Layout from "./components/Layout";
import AuthPage from "./pages/AuthPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { useAuth } from "./hooks/useAuth";
import { useAppSettings } from "./hooks/useAppSettings"; // Import useAppSettings
import TopNavBar from "./components/TopNavBar";
import { Button } from "./components/ui/button"; // Import Button for feedback

const queryClient = new QueryClient();

// Component to apply app settings and render children
const AppSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  useAppSettings(); // This hook handles setting CSS variables
  return <>{children}</>;
};

// ProtectedRoute component to guard routes
const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="tw-min-h-screen tw-flex tw-items-center tw-justify-center tw-bg-background tw-text-foreground">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If authenticated, render the Outlet for nested routes
  return <Outlet />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppSettingsProvider> {/* Wrap the entire app with AppSettingsProvider */}
          <TopNavBar />
          <div className="tw-min-h-screen tw-flex tw-flex-col tw-bg-background tw-text-foreground tw-pt-16">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/subscribe" element={<SubscriptionPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Protected routes that use the Layout */}
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/posts/:postId" element={<PostDetailPage />} />
                </Route>
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;