import { apiJson, apiUpload } from "@/services/api";
import type {
  AnalysisResponse,
  ExtractionProvider,
  JobMatchResponse,
  SkillCategory,
  SkillMapping,
} from "./types";

type MessageResponse = { success: boolean; message: string };

export const analyzeResume = (file: File, provider: ExtractionProvider) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("provider", provider);
  return apiUpload<AnalysisResponse>("/api/analyze", formData);
};

export const matchJob = (jobDescription: string, skills: string[]) =>
  apiJson<JobMatchResponse>("/api/job-match", {
    method: "POST",
    body: JSON.stringify({ job_description: jobDescription, skills }),
  });

export const getSkillMappings = () => apiJson<{ mappings: SkillMapping[] }>("/api/knowledge/skills");

export const addSkillMapping = (raw: string, normalized: string, category: SkillCategory) =>
  apiJson<MessageResponse>("/api/knowledge/skills", {
    method: "POST",
    body: JSON.stringify({ raw, normalized, category }),
  });

export const deleteSkillMapping = (rawTerm: string) =>
  apiJson<MessageResponse>(`/api/knowledge/skills/${encodeURIComponent(rawTerm)}`, { method: "DELETE" });
