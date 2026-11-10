import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/modules/auth/ProtectedRoute";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import Index from "@/app/pages/Index";
import Login from "@/modules/auth/pages/Login";
import Register from "@/modules/auth/pages/Register";
import NotFound from "@/app/pages/NotFound";

// Layout
import { DashboardLayout } from "@/layouts/DashboardLayout";

// Job Seeker Pages
import SeekerDashboard from "@/modules/job-seeker/pages/SeekerDashboard";
import SeekerProfile from "@/modules/job-seeker/pages/SeekerProfile";
import CVUpload from "@/modules/job-seeker/pages/CVUpload";
import GeneralizedCV from "@/modules/job-seeker/pages/GeneralizedCV";
import JobListings from "@/modules/job-seeker/pages/JobListings";

// Job Seeker: resume analysis (ported from the standalone AI Resume Analyzer)
import { ResumeAnalysisProvider } from "@/modules/job-seeker/resume-analysis/ResumeAnalysisContext";
import ResumeUpload from "@/modules/job-seeker/resume-analysis/pages/ResumeUpload";
import AtsReport from "@/modules/job-seeker/resume-analysis/pages/AtsReport";
import ResumeExplorer from "@/modules/job-seeker/resume-analysis/pages/ResumeExplorer";
import JobMatcher from "@/modules/job-seeker/resume-analysis/pages/JobMatcher";
import SkillsDictionary from "@/modules/job-seeker/resume-analysis/pages/SkillsDictionary";

// Recruiter Pages
import RecruiterDashboard from "@/modules/recruiter/pages/RecruiterDashboard";
import RecruiterProfile from "@/modules/recruiter/pages/RecruiterProfile";
import PostJob from "@/modules/recruiter/pages/PostJob";
import CandidateScreening from "@/modules/recruiter/pages/CandidateScreening";
import Shortlist from "@/modules/recruiter/pages/Shortlist";
import CandidateDetail from "@/modules/recruiter/pages/CandidateDetail";
import Interviews from "@/modules/shared/pages/Interviews";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme" attribute="class">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ToastContainer position="bottom-right" autoClose={5000} theme="dark" />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              {/* Job Seeker Routes */}
              <Route
                path="/seeker"
                element={
                  <ResumeAnalysisProvider>
                    <DashboardLayout role="seeker" />
                  </ResumeAnalysisProvider>
                }
              >
                <Route path="dashboard" element={<SeekerDashboard />} />
                <Route path="profile" element={<SeekerProfile />} />
                <Route path="cv-upload" element={<CVUpload />} />
                <Route path="generalized-cv" element={<GeneralizedCV />} />
                <Route path="jobs" element={<JobListings />} />
                <Route path="interviews" element={<Interviews />} />
                <Route path="resume-analysis" element={<ResumeUpload />} />
                <Route path="resume-analysis/report" element={<AtsReport />} />
                <Route path="resume-analysis/explorer" element={<ResumeExplorer />} />
                <Route path="resume-analysis/job-match" element={<JobMatcher />} />
                <Route path="resume-analysis/skills" element={<SkillsDictionary />} />
              </Route>

              {/* Recruiter Routes */}
              <Route path="/recruiter" element={<DashboardLayout role="recruiter" />}>
                <Route path="dashboard" element={<RecruiterDashboard />} />
                <Route path="profile" element={<RecruiterProfile />} />
                <Route path="post-job" element={<PostJob />} />
                <Route path="candidates" element={<CandidateScreening />} />
                <Route path="shortlist" element={<Shortlist />} />
                <Route path="candidate/:candidateId" element={<CandidateDetail />} />
                <Route path="interviews" element={<Interviews />} />
              </Route>
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
