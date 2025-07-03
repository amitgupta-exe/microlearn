
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

/**
 * Home Route Component - handles routing based on auth state
 * Always redirects to login for fresh authentication
 */
function HomeRoute() {
  const { user, userRole, loading } = useMultiAuth();

  console.log('HomeRoute - user:', user, 'userRole:', userRole, 'loading:', loading);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Always redirect to login for fresh authentication
  if (!user || !userRole) {
    console.log('No authenticated user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Role-based routing
  switch (userRole) {
    case 'learner':
      console.log('Learner detected, redirecting to learner dashboard');
      return <Navigate to="/learner-dashboard" replace />;
    
    case 'superadmin':
      console.log('Super admin detected, redirecting to super admin dashboard');
      return <Navigate to="/superadmin" replace />;
    
    case 'admin':
    default:
      console.log('Admin user detected, redirecting to admin dashboard');
      return <Navigate to="/dashboard" replace />;
  }
}

/**
 * Protected Route Component for Admin Users
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, userRole, loading } = useMultiAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !userRole) {
    console.log('No authenticated user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (userRole === 'learner') {
    console.log('Learner trying to access admin route, redirecting to learner dashboard');
    return <Navigate to="/learner-dashboard" replace />;
  }

  if (userRole !== 'admin' && userRole !== 'superadmin') {
    console.log('Non-admin trying to access admin route, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (userRole === 'superadmin') {
    console.log('Super admin detected, redirecting to super admin dashboard');
    return <Navigate to="/superadmin" replace />;
  }

  return (
    <div className="flex h-screen bg-white">
      <Sidebar user={user as any} />
      <main className="flex-1 overflow-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}

/**
 * Super Admin Protected Route
 */
function SuperAdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, userRole, loading } = useMultiAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || userRole !== 'superadmin') {
    console.log('Not super admin, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/**
 * Learner Protected Route
 */
function LearnerProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, userRole, loading } = useMultiAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || userRole !== 'learner') {
    console.log('Not learner, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
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
                    
                    {/* Home route - handles auth-based redirects */}
                    <Route path="/" element={<HomeRoute />} />
                    
                    {/* Super Admin routes */}
                    <Route 
                      path="/superadmin" 
                      element={
                        <SuperAdminProtectedRoute>
                          <SuperAdminDashboard />
                        </SuperAdminProtectedRoute>
                      } 
                    />
                    
                    {/* Learner-specific route */}
                    <Route 
                      path="/learner-dashboard" 
                      element={
                        <LearnerProtectedRoute>
                          <LearnerDashboard />
                        </LearnerProtectedRoute>
                      } 
                    />

                    {/* Protected routes with sidebar for regular admins */}
                    <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
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
