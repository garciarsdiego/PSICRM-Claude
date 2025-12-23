import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeCustomizationProvider } from '@/contexts/ThemeCustomizationContext';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AnimatePresence } from 'framer-motion';

// Pages
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Schedule from "./pages/Schedule";
import Financial from "./pages/Financial";
import Messages from "./pages/Messages";
import Emails from "./pages/Emails";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";

// Patient Portal
import PatientAuth from "./pages/patient/PatientAuth";
import PatientDashboard from "./pages/patient/PatientDashboard";
import PatientSessions from "./pages/patient/PatientSessions";
import PatientPayments from "./pages/patient/PatientPayments";
import PatientBooking from "./pages/patient/PatientBooking";
import PatientMessages from "./pages/patient/PatientMessages";

// Public Pages
import PublicBooking from "./pages/public/PublicBooking";
import PendingApproval from "./pages/PendingApproval";


import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminClinics from "./pages/admin/AdminClinics";
import AdminAudit from "./pages/admin/AdminAudit";
import AdminSettings from "./pages/admin/AdminSettings";
import TeamSettings from "./pages/settings/TeamSettings";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/pending-approval" element={<PendingApproval />} />

        {/* Professional Routes - Protected */}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRole="professional">
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/patients" element={
          <ProtectedRoute allowedRole="professional">
            <Patients />
          </ProtectedRoute>
        } />
        <Route path="/schedule" element={
          <ProtectedRoute allowedRole="professional">
            <Schedule />
          </ProtectedRoute>
        } />
        <Route path="/financial" element={
          <ProtectedRoute allowedRole="professional">
            <Financial />
          </ProtectedRoute>
        } />
        <Route path="/messages" element={
          <ProtectedRoute allowedRole="professional">
            <Messages />
          </ProtectedRoute>
        } />
        <Route path="/emails" element={
          <ProtectedRoute allowedRole="professional">
            <Emails />
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute allowedRole="professional">
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/settings/team" element={
          <ProtectedRoute allowedRole="professional">
            <TeamSettings />
          </ProtectedRoute>
        } />

        {/* Admin Routes - Protected for Global Admins */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute allowedRole="admin">
            <AdminUsers />
          </ProtectedRoute>
        } />
        <Route path="/admin/clinics" element={
          <ProtectedRoute allowedRole="admin">
            <AdminClinics />
          </ProtectedRoute>
        } />
        <Route path="/admin/audit" element={
          <ProtectedRoute allowedRole="admin">
            <AdminAudit />
          </ProtectedRoute>
        } />
        <Route path="/admin/settings" element={
          <ProtectedRoute allowedRole="admin">
            <AdminSettings />
          </ProtectedRoute>
        } />

        {/* Patient Portal Routes - Protected */}
/* ... */
        <Route path="/patient/auth" element={<PatientAuth />} />
        <Route path="/patient/dashboard" element={
          <ProtectedRoute allowedRole="patient">
            <PatientDashboard />
          </ProtectedRoute>
        } />
        <Route path="/patient/sessions" element={
          <ProtectedRoute allowedRole="patient">
            <PatientSessions />
          </ProtectedRoute>
        } />
        <Route path="/patient/payments" element={
          <ProtectedRoute allowedRole="patient">
            <PatientPayments />
          </ProtectedRoute>
        } />
        <Route path="/patient/book" element={
          <ProtectedRoute allowedRole="patient">
            <PatientBooking />
          </ProtectedRoute>
        } />
        <Route path="/patient/messages" element={
          <ProtectedRoute allowedRole="patient">
            <PatientMessages />
          </ProtectedRoute>
        } />

        {/* Public Routes */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/book/:professionalId" element={<PublicBooking />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <ThemeCustomizationProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AnimatedRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeCustomizationProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
