import { useState, type FormEvent } from "react";
import { AlertTriangle, Loader2, Plus, Sparkles, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/cn";
import { matchJob } from "../api";
import { AnalysisEmptyState } from "../components/AnalysisEmptyState";
import { useResumeAnalysis } from "../ResumeAnalysisContext";
import type { JobMatchResponse } from "../types";

type MatchStatus = "idle" | "analyzing" | "results";

const importanceTone = (importance: string) =>
  importance === "High"
    ? "bg-destructive/10 text-destructive border-destructive/20"
    : importance === "Medium"
      ? "bg-warning/10 text-warning border-warning/20"
      : "bg-muted text-muted-foreground";

const JobMatcher = () => {
  const { analysisData } = useResumeAnalysis();
  const [jobDescription, setJobDescription] = useState("");
  const [status, setStatus] = useState<MatchStatus>("idle");
  const [result, setResult] = useState<JobMatchResponse | null>(null);
  const [error, setError] = useState("");

  if (!analysisData) {
    return (
      <div className="space-y-6 animate-fade-in max-w-5xl">
        <AnalysisEmptyState
          title="Upload a Resume First"
          message="Job matching requires extracted skills from the currently uploaded resume."
        />
      </div>
    );
  }

  const handleAnalyze = async (e: FormEvent) => {
    e.preventDefault();
    if (!jobDescription.trim()) return;
    setStatus("analyzing");
    setError("");
    try {
      setResult(await matchJob(jobDescription, analysisData.skills ?? []));
      setStatus("results");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Failed to run job matching.");
      setStatus("idle");
    }
  };

  const handleReset = () => {
    setJobDescription("");
    setStatus("idle");
    setResult(null);
    setError("");
  };

  const matchScore = result?.match_score ?? 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Semantic Job Matcher</h1>
        <p className="text-muted-foreground mt-1">
          Paste a job description to compare key skills, find critical vocabulary gaps, and audit candidate alignment.
        </p>
      </div>

      {status === "idle" && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleAnalyze} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="job-description" className="flex items-center gap-2">
                  <Target className="h-4 w-4" aria-hidden="true" /> Target Job Description
                </Label>
                <Textarea
                  id="job-description"
                  rows={10}
                  placeholder="Paste the target job description here (responsibilities, requirements, technical qualifications)..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={!jobDescription.trim()} className="gap-2">
                Analyze Candidate Match <Sparkles className="h-4 w-4" aria-hidden="true" />
              </Button>
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            </form>
          </CardContent>
        </Card>
      )}

      {status === "analyzing" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center" aria-live="polite">
            <Loader2 className="h-8 w-8 animate-spin text-accent" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-foreground">Running Semantic Matching</h3>
            <p className="text-sm text-muted-foreground">
              Comparing resume tokens against job taxonomy using sentence-transformers...
            </p>
          </CardContent>
        </Card>
      )}

      {status === "results" && result && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Compatibility Score</h3>
                    <p className="text-sm text-muted-foreground">Good alignment with key requirements.</p>
                  </div>
                  <span className="text-3xl font-semibold tabular-nums text-accent">{matchScore}%</span>
                </div>
                <Progress value={matchScore} aria-label="Compatibility score" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Critical Vocabulary Gaps</CardTitle>
                <CardDescription>
                  We detected the following missing keywords on your resume that are heavily weighted in this job description.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {result.missing_keywords.map((kw) => (
                  <Badge key={kw} variant="outline" className="gap-1">
                    <Plus className="h-3 w-3" aria-hidden="true" /> {kw}
                  </Badge>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Matching Skills</CardTitle>
                <CardDescription>These terms overlap between your resume and the target job description.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {result.matching_keywords.map((kw) => (
                  <Badge key={kw} variant="secondary">{kw}</Badge>
                ))}
              </CardContent>
            </Card>

            <Button variant="outline" onClick={handleReset}>Analyze Another Job Description</Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ATS Optimization Roadmap</CardTitle>
              <CardDescription>Incorporate these points to increase match relevance:</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {result.action_plan.map((action) => (
                  <li key={action.step} className="space-y-1.5 rounded-lg border p-3">
                    <Badge variant="outline" className={cn(importanceTone(action.importance))}>
                      {action.importance} Priority
                    </Badge>
                    <p className="text-sm text-foreground">{action.step}</p>
                  </li>
                ))}
              </ul>

              <div className="flex gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                <p><strong>Career Fit Analysis:</strong> {result.career_fit_analysis}</p>
              </div>
              <div className="flex gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                <p><strong>Suggested Improvements:</strong> {result.suggested_improvements.join(" ")}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default JobMatcher;
