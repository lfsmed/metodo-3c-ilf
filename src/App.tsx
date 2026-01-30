import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Applications from "./pages/Applications";
import Financial from "./pages/Financial";
import Medications from "./pages/Medications";
import Questions from "./pages/Questions";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPatients from "./pages/admin/AdminPatients";
import AdminApplications from "./pages/admin/AdminApplications";
import AdminFinancial from "./pages/admin/AdminFinancial";
import AdminMedications from "./pages/admin/AdminMedications";
import AdminEvaluations from "./pages/admin/AdminEvaluations";
import AdminQuestions from "./pages/admin/AdminQuestions";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/financial" element={<Financial />} />
            <Route path="/medications" element={<Medications />} />
            <Route path="/questions" element={<Questions />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/patients" element={<AdminPatients />} />
            <Route path="/admin/applications" element={<AdminApplications />} />
            <Route path="/admin/financial" element={<AdminFinancial />} />
            <Route path="/admin/medications" element={<AdminMedications />} />
            <Route path="/admin/evaluations" element={<AdminEvaluations />} />
            <Route path="/admin/questions" element={<AdminQuestions />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
