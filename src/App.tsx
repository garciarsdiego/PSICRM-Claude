import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            
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
            
            {/* Patient Portal Routes - Protected */}
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
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
