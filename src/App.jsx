import { useState, useEffect } from 'react';
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
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Home from '@/pages/Home';
import MyDuties from '@/pages/MyDuties';
import Swaps from '@/pages/Swaps';
import Incidents from '@/pages/Incidents';
import Notifications from '@/pages/Notifications';
import Profile from '@/pages/Profile';
import AdminDashboard from '@/pages/AdminDashboard';
import Teachers from '@/pages/Teachers';
import ScheduleEditor from '@/pages/ScheduleEditor';
import SettingsPage from '@/pages/SettingsPage';
import Onboarding from '@/pages/Onboarding';
import SpecialDays from '@/pages/SpecialDays';
import SpecialDayEditor from '@/pages/SpecialDayEditor';
import FixedSchedule from '@/pages/FixedSchedule';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // מסך טעינה ממותג — מוצג לפחות 2.4 שניות בכניסה לאתר
  const [minLoaderDone, setMinLoaderDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinLoaderDone(true), 2400);
    return () => clearTimeout(t);
  }, []);

  if (isLoadingPublicSettings || isLoadingAuth || !minLoaderDone) {
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