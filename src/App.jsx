import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import AppLoader from '@/components/AppLoader';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Home = lazy(() => import('@/pages/Home'));
const MyDuties = lazy(() => import('@/pages/MyDuties'));
const Swaps = lazy(() => import('@/pages/Swaps'));
const Incidents = lazy(() => import('@/pages/Incidents'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const Profile = lazy(() => import('@/pages/Profile'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const Teachers = lazy(() => import('@/pages/Teachers'));
const ScheduleEditor = lazy(() => import('@/pages/ScheduleEditor'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const SpecialDays = lazy(() => import('@/pages/SpecialDays'));
const SpecialDayEditor = lazy(() => import('@/pages/SpecialDayEditor'));
const FixedSchedule = lazy(() => import('@/pages/FixedSchedule'));
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <AppLoader />;
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Suspense fallback={<AppLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/my-duties" element={<MyDuties />} />
            <Route path="/swaps" element={<Swaps />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/teachers" element={<Teachers />} />
            <Route path="/schedule" element={<ScheduleEditor />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/special-days" element={<SpecialDays />} />
            <Route path="/special-days/:id" element={<SpecialDayEditor />} />
            <Route path="/fixed-schedule" element={<FixedSchedule />} />
          </Route>
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App