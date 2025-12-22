import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Schedule from "./pages/Schedule";
import Records from "./pages/Records";
import Financial from "./pages/Financial";
import Messages from "./pages/Messages";
import Emails from "./pages/Emails";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
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
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/records" element={<Records />} />
            <Route path="/financial" element={<Financial />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/emails" element={<Emails />} />
            <Route path="/settings" element={<Settings />} />
            {/* Patient Portal Routes */}
            <Route path="/patient/auth" element={<PatientAuth />} />
            <Route path="/patient/dashboard" element={<PatientDashboard />} />
            <Route path="/patient/sessions" element={<PatientSessions />} />
            <Route path="/patient/payments" element={<PatientPayments />} />
            <Route path="/patient/book" element={<PatientBooking />} />
            <Route path="/patient/messages" element={<PatientMessages />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
