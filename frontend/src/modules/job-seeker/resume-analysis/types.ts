// Response shapes of the resume analysis API (backend/app/modules/resumes/analysis_schemas.py).

export type ExtractionProvider = "auto" | "custom_rule" | "gemini" | "cerebras";

export type PersonalInfo = {
  name: string | null;
  professional_title: string | null;
  email: string | null;
  mobile_number: string | null;
  address: string | null;
  linkedin: string | null;
  github: string | null;
  portfolio: string | null;
  website: string | null;
  college_name: string | null;
  degree: string | null;
  designation: string | null;
  company_names: string[];
  no_of_pages: number;
  candidate_level: string | null;
};

export type ExperienceItem = {
  company: string;
  position: string;
  employment_period: string;
  location: string;
  responsibilities: string[];
  achievements: string[];
  technologies_used: string[];
};

export type EducationItem = {
  degree: string;
  institution: string;
  dates: string;
  gpa: string;
  coursework: string[];
};

export type NormalizedSkillItem = {
  original: string;
  normalized: string;
  category: string;
  confidence: number;
};

export type AtsBreakdownItem = {
  name: string;
  score: number;
  max_score: number;
  icon: string;
  explanation: string;
};

export type AtsScore = {
  overall: number;
  breakdown: AtsBreakdownItem[];
  strengths: string[];
  improvements: string[];
  keywords_found: string[];
  section_coverage: Record<string, boolean>;
};

export type AnalysisResponse = {
  success: boolean;
  filename: string;
  provider_used: string;
  fallback_used: boolean;
  confidence_score: number;
  personal_info: PersonalInfo;
  skills: string[];
  technical_skills: string[];
  soft_skills: string[];
  skill_categories: Record<string, string[]>;
  normalized_skill_map: NormalizedSkillItem[];
  experience: string | null;
  experiences: ExperienceItem[];
  total_experience: number;
  projects: string[];
  education: string | null;
  education_entries: EducationItem[];
  summary: string | null;
  certifications: string[];
  languages: string[];
  awards: string[];
  publications: string[];
  interests: string[];
  ats_score: AtsScore;
};

export type ActionPlanItem = {
  step: string;
  importance: "High" | "Medium" | "Low" | string;
};

export type JobMatchResponse = {
  match_score: number;
  missing_keywords: string[];
  matching_keywords: string[];
  action_plan: ActionPlanItem[];
  career_fit_analysis: string;
  suggested_improvements: string[];
};

export type SkillCategory = "frontend" | "backend" | "devops";

export type SkillMapping = {
  raw: string;
  normalized: string;
  category: SkillCategory | string;
};
