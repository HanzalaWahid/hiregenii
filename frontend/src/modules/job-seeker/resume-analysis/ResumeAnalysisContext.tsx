import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { analyzeResume } from "./api";
import type { AnalysisResponse, ExtractionProvider } from "./types";

type ResumeAnalysisContextValue = {
  analysisData: AnalysisResponse | null;
  isLoading: boolean;
  error: string | null;
  runAnalysis: (file: File, provider: ExtractionProvider) => Promise<AnalysisResponse>;
  clearAnalysis: () => void;
};

const ResumeAnalysisContext = createContext<ResumeAnalysisContextValue | null>(null);

// Holds the latest analysis result in memory while the user moves between the
// resume-analysis pages (not persisted; a refresh clears it, as before).
export const ResumeAnalysisProvider = ({ children }: { children: ReactNode }) => {
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(async (file: File, provider: ExtractionProvider) => {
    setIsLoading(true);
    setError(null);
    setAnalysisData(null);
    try {
      const result = await analyzeResume(file, provider);
      setAnalysisData(result);
      return result;
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Analysis failed. Please try again.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysisData(null);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({ analysisData, isLoading, error, runAnalysis, clearAnalysis }),
    [analysisData, isLoading, error, runAnalysis, clearAnalysis]
  );

  return <ResumeAnalysisContext.Provider value={value}>{children}</ResumeAnalysisContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useResumeAnalysis = () => {
  const ctx = useContext(ResumeAnalysisContext);
  if (!ctx) throw new Error("useResumeAnalysis must be used within <ResumeAnalysisProvider>");
  return ctx;
};
