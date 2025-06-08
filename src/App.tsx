
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MultiAuthProvider, useMultiAuth } from "@/contexts/MultiAuthContext";
import { SuperAdminProvider } from "@/contexts/SuperAdminContext";
import { ThemeProvider } from "next-themes";
import Sidebar from "@/components/Sidebar";
import Index from "./pages/Index";
import Learners from "./pages/Learners";
import Courses from "./pages/Courses";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AuthCallback from "./pages/AuthCallback";
import SuperAdminLogin from "./pages/SuperAdminLogin";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import LearnerDashboard from "./pages/LearnerDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, userRole, loading } = useMultiAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-white">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect learners to their dashboard
  if (userRole === 'learner') {
    return <Navigate to="/learner-dashboard" replace />;
  }

  return (
    <div className="flex h-screen bg-white">
      <Sidebar user={user} />
      <main className="flex-1 overflow-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <TooltipProvider>
          <BrowserRouter>
            <MultiAuthProvider>
              <SuperAdminProvider>
                <Toaster />
                <div className="min-h-screen bg-white">
                  <Routes>
                    {/* Public routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/admin/login" element={<SuperAdminLogin />} />
                    <Route path="/admin" element={<SuperAdminDashboard />} />
                    
                    {/* Learner-specific route */}
                    <Route path="/learner-dashboard" element={<LearnerDashboard />} />

                    {/* Protected routes with sidebar */}
                    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                    <Route path="/learners" element={<ProtectedRoute><Learners /></ProtectedRoute>} />
                    <Route path="/learners/:id" element={<ProtectedRoute><Learners /></ProtectedRoute>} />
                    <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
                    <Route path="/courses/:id" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
                    <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </div>
              </SuperAdminProvider>
            </MultiAuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
