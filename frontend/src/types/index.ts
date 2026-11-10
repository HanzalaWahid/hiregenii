// User Types
export type UserRole = 'seeker' | 'recruiter';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  createdAt: Date;
}

// Job Seeker Types
export interface JobSeekerProfile {
  id: string;
  candidateId: string;
  skills: Skill[];
  experience: Experience[];
  education: Education[];
  profileCompletion: number;
  cvUploaded: boolean;
  anonymizationStatus: 'pending' | 'processing' | 'complete';
}

export interface Skill {
  name: string;
  proficiency: number; // 0-100
}

export interface Experience {
  id: string;
  title: string;
  duration: string;
  description: string;
}

export interface Education {
  id: string;
  degree: string;
  field: string;
  year: string;
}

// Sensitive Attributes (detected and hidden)
export interface SensitiveAttributes {
  name: string;
  university: string;
  contactInfo: string;
  location: string;
}

// Job Types
export interface Job {
  id: string;
  title: string;
  company: string;
  requiredSkills: SkillRequirement[];
  experienceLevel: 'entry' | 'mid' | 'senior';
  description: string;
  postedDate: Date;
  applicantCount: number;
  status: 'active' | 'closed';
}

export interface SkillRequirement {
  skill: string;
  weight: number; // 0-100
}

// Application Types
export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  matchPercentage: number;
  status: 'applied' | 'shortlisted' | 'revealed' | 'rejected';
  appliedDate: Date;
}

// Candidate View (for recruiters)
export interface AnonymizedCandidate {
  id: string; // Application ID
  candidateId: string;
  skills: string[]; // Fixed to string[] to match backend
  experienceSummary: string;
  educationLevel: string;
  matchPercentage: number;
  isShortlisted: boolean;
  isRevealed: boolean;
  revealStatus?: string;
  company?: string;
}

export interface RevealedCandidate extends AnonymizedCandidate {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  university: string;
  fullExperience: Experience[];
  fullEducation: Education[];
}

// Recruiter Types
export interface RecruiterStats {
  activeJobPosts: number;
  totalApplicants: number;
  shortlistedCount: number;
}

// Notification Types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'reveal_request';
  read: boolean;
  createdAt: Date;
  extra_data?: any;
}
