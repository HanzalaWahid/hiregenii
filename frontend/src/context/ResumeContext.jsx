/**
 * ResumeContext — global state for analysis results shared across all views.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { analyzeResume } from '../utils/api';

const ResumeContext = createContext(null);

export function ResumeProvider({ children }) {
  const [analysisData, setAnalysisData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const runAnalysis = useCallback(async (file, provider) => {
    setIsLoading(true);
    setError(null);
    setAnalysisData(null);
    try {
      const result = await analyzeResume(file, provider);
      setAnalysisData(result);
      return result;
    } catch (err) {
      setError(err.message || 'Analysis failed. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysisData(null);
    setError(null);
  }, []);

  return (
    <ResumeContext.Provider value={{ analysisData, isLoading, error, runAnalysis, clearAnalysis }}>
      {children}
    </ResumeContext.Provider>
  );
}

export function useResume() {
  const ctx = useContext(ResumeContext);
  if (!ctx) throw new Error('useResume must be used within <ResumeProvider>');
  return ctx;
}
