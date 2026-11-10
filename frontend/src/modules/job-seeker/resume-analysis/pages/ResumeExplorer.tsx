import {
  AlertCircle,
  Briefcase,
  Calendar,
  Cpu,
  Globe,
  GraduationCap,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  User,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalysisEmptyState } from "../components/AnalysisEmptyState";
import { useResumeAnalysis } from "../ResumeAnalysisContext";

const SKILL_SECTIONS = [
  { key: "programming_languages", title: "Programming Languages" },
  { key: "frameworks", title: "Frameworks" },
  { key: "libraries", title: "Libraries" },
  { key: "databases", title: "Databases" },
  { key: "cloud_platforms", title: "Cloud Platforms" },
  { key: "ai_ml", title: "AI/ML" },
  { key: "data_science", title: "Data Science" },
  { key: "devops", title: "DevOps" },
  { key: "tools", title: "Tools" },
  { key: "soft_skills", title: "Soft Skills" },
];

type ContactRow = { key: string; label: string; value: string | null; icon: LucideIcon; href?: string | null };

const yearOf = (value: string) => {
  const match = String(value || "").match(/(20\d{2}|19\d{2})/);
  return match ? parseInt(match[1], 10) : 0;
};

const EmptySection = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center gap-3 py-8 text-center text-muted-foreground">
    <AlertCircle className="h-6 w-6" aria-hidden="true" />
    <p className="text-sm">{message}</p>
  </div>
);

const ResumeExplorer = () => {
  const { analysisData } = useResumeAnalysis();

  if (!analysisData) {
    return (
      <div className="space-y-6 animate-fade-in max-w-5xl">
        <AnalysisEmptyState message="Upload a resume to explore the extracted data." />
      </div>
    );
  }

  const personalInfo = analysisData.personal_info;
  const skills = analysisData.skills ?? [];
  const skillCategories = analysisData.skill_categories ?? {};
  const educationEntries = analysisData.education_entries ?? [];
  const summary = analysisData.summary ?? "";
  const totalExperience = analysisData.total_experience ?? 0;
  const sortedExperiences = [...(analysisData.experiences ?? [])].sort(
    (a, b) => yearOf(b.employment_period) - yearOf(a.employment_period)
  );

  const contactRows: ContactRow[] = [
    { key: "email", label: "Email", value: personalInfo.email, icon: Mail, href: personalInfo.email ? `mailto:${personalInfo.email}` : null },
    { key: "mobile_number", label: "Phone", value: personalInfo.mobile_number, icon: Phone },
    { key: "address", label: "Address", value: personalInfo.address, icon: MapPin },
    { key: "linkedin", label: "LinkedIn", value: personalInfo.linkedin, icon: Linkedin, href: personalInfo.linkedin },
    { key: "github", label: "GitHub", value: personalInfo.github, icon: Globe, href: personalInfo.github },
    { key: "portfolio", label: "Portfolio", value: personalInfo.portfolio, icon: Globe, href: personalInfo.portfolio },
    { key: "website", label: "Website", value: personalInfo.website, icon: Globe, href: personalInfo.website },
  ].filter((row) => row.value);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Resume Object Explorer</h1>
        <p className="text-muted-foreground mt-1">Navigate through extracted data items parsed by the system's pipeline.</p>
      </div>

      <Tabs defaultValue="personal">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="personal" className="gap-2"><User className="h-4 w-4" aria-hidden="true" /> Contact Details</TabsTrigger>
          <TabsTrigger value="experience" className="gap-2"><Briefcase className="h-4 w-4" aria-hidden="true" /> Work History</TabsTrigger>
          <TabsTrigger value="education" className="gap-2"><GraduationCap className="h-4 w-4" aria-hidden="true" /> Education</TabsTrigger>
          <TabsTrigger value="skills" className="gap-2"><Cpu className="h-4 w-4" aria-hidden="true" /> Skills Database</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card>
            <CardContent className="grid gap-8 pt-6 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                  <User className="h-8 w-8 text-accent" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">{personalInfo.name || "Name not extracted"}</h2>
                <p className="text-sm text-muted-foreground">
                  {personalInfo.professional_title || personalInfo.designation || "Professional title not extracted"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Level: {personalInfo.candidate_level || "N/A"} | Experience: {totalExperience.toFixed(1)} years
                </p>
                {summary && <p className="pt-2 text-sm leading-relaxed text-foreground">{summary}</p>}
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Contact Information</h3>
                <dl className="space-y-3">
                  {contactRows.map((row) => {
                    const Icon = row.icon;
                    return (
                      <div key={row.key} className="flex items-start gap-3">
                        <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        <div className="min-w-0">
                          <dt className="text-xs text-muted-foreground">{row.label}</dt>
                          <dd className="break-words text-sm text-foreground">
                            {row.href ? (
                              <a href={row.href} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                                {row.value}
                              </a>
                            ) : (
                              row.value
                            )}
                          </dd>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-start gap-3">
                    <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Resume Pages</dt>
                      <dd className="text-sm text-foreground">{personalInfo.no_of_pages || "N/A"}</dd>
                    </div>
                  </div>
                </dl>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experience">
          <Card>
            <CardContent className="pt-6">
              {sortedExperiences.length > 0 ? (
                <ol className="space-y-4 border-l border-border pl-6">
                  {sortedExperiences.map((exp, idx) => (
                    <li key={`${exp.company}-${exp.position}-${idx}`} className="relative">
                      <span className="absolute -left-[33px] flex h-5 w-5 items-center justify-center rounded-full border bg-background">
                        <Briefcase className="h-3 w-3 text-accent" aria-hidden="true" />
                      </span>
                      <div className="rounded-lg border p-4 space-y-1.5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h3 className="font-medium text-foreground">{exp.position || personalInfo.designation || "Role"}</h3>
                            <p className="text-sm text-muted-foreground">{exp.company || "Company"}</p>
                          </div>
                          <Badge variant="outline" className="gap-1.5">
                            <Calendar className="h-3 w-3" aria-hidden="true" /> {exp.employment_period || "Period not detected"}
                          </Badge>
                        </div>
                        {exp.location && <p className="text-sm text-muted-foreground">Location: {exp.location}</p>}
                        {exp.responsibilities?.length > 0 && (
                          <p className="text-sm text-muted-foreground">Responsibilities: {exp.responsibilities.join(" | ")}</p>
                        )}
                        {exp.achievements?.length > 0 && (
                          <p className="text-sm text-muted-foreground">Achievements: {exp.achievements.join(" | ")}</p>
                        )}
                        {exp.technologies_used?.length > 0 && (
                          <p className="text-sm text-muted-foreground">Technologies: {exp.technologies_used.join(", ")}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptySection message="No work experience extracted" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="education">
          <Card>
            <CardContent className="pt-6">
              {educationEntries.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {educationEntries.map((edu, idx) => (
                    <div key={`${edu.institution}-${idx}`} className="rounded-lg border p-4 space-y-1.5">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                          <GraduationCap className="h-5 w-5 text-accent" aria-hidden="true" />
                        </span>
                        <div>
                          <h3 className="font-medium text-foreground">{edu.degree || personalInfo.degree || "Degree"}</h3>
                          <p className="text-sm text-muted-foreground">{edu.institution || personalInfo.college_name || "Institution"}</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">Dates: {edu.dates || "Not specified"}</p>
                      {edu.gpa && <p className="text-sm text-muted-foreground">GPA: {edu.gpa}</p>}
                      {edu.coursework?.length > 0 && (
                        <p className="text-sm text-muted-foreground">Relevant Coursework: {edu.coursework.join(", ")}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptySection message="No education information extracted" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills">
          <Card>
            <CardContent className="pt-6">
              {skills.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {SKILL_SECTIONS.map((section) => {
                    const sectionSkills = skillCategories[section.key] ?? [];
                    if (!sectionSkills.length) return null;
                    return (
                      <div key={section.key} className="rounded-lg border p-4">
                        <h3 className="mb-3 text-sm font-medium text-foreground">
                          {section.title} ({sectionSkills.length})
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {sectionSkills.map((skill) => (
                            <Badge key={`${section.key}-${skill}`} variant="secondary">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptySection message="No skills extracted" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ResumeExplorer;
