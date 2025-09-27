import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import PostDetailPage from "./pages/PostDetailPage"; // Import PostDetailPage
import Layout from "./components/Layout";
import AuthPage from "./pages/AuthPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import { useAuth } from "./hooks/useAuth";
import TopNavBar from "./components/TopNavBar"; // Import TopNavBar here

const queryClient = new QueryClient();

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
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}> {/* Added future flags */}
        <TopNavBar /> {/* Render TopNavBar globally */}
        <div className="tw-min-h-screen tw-flex tw-flex-col tw-bg-background tw-text-foreground tw-pt-16"> {/* Main content wrapper with padding for fixed TopNavBar */}
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/subscribe" element={<SubscriptionPage />} />
            <Route path="/reset-password" element={<div>Password Reset Page (Implement this later)</div>} />

            {/* Protected routes that use the Layout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}> {/* Layout now wraps the protected content */}
                <Route path="/home" element={<HomePage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/posts/:postId" element={<PostDetailPage />} /> {/* New Post Detail Page route */}
              </Route>
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;