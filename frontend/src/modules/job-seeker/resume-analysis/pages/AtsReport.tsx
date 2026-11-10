import { useEffect, useState } from "react";
import {
  Briefcase,
  Check,
  Cpu,
  FolderOpen,
  GraduationCap,
  HelpCircle,
  Key,
  Layout,
  TrendingUp,
  User,
  type LucideIcon,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import { AnalysisEmptyState } from "../components/AnalysisEmptyState";
import { useResumeAnalysis } from "../ResumeAnalysisContext";

const ICONS: Record<string, LucideIcon> = {
  user: User,
  briefcase: Briefcase,
  "graduation-cap": GraduationCap,
  cpu: Cpu,
  layout: Layout,
  key: Key,
  "folder-open": FolderOpen,
};

const getRankLabel = (score: number) => {
  if (score >= 85) return "Top 10%";
  if (score >= 70) return "Top 25%";
  if (score >= 55) return "Top 50%";
  return "Below Average";
};

const getScoreDescriptor = (score: number) => {
  if (score >= 85) return "Outstanding Resume — Ready for enterprise routing.";
  if (score >= 70) return "Strong Candidate Alignment — Minor improvements recommended.";
  if (score >= 50) return "Moderate Match — Several areas need enhancement.";
  return "Needs Improvement — Significant gaps detected.";
};

const scoreTone = (score: number) => (score >= 80 ? "text-success" : score >= 60 ? "text-accent" : "text-destructive");
const barTone = (pct: number) => (pct >= 80 ? "bg-success" : pct >= 60 ? "bg-accent" : "bg-warning");

const RADIUS = 90;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AtsReport = () => {
  const { analysisData } = useResumeAnalysis();
  const [animatedScore, setAnimatedScore] = useState(0);

  const atsData = analysisData?.ats_score;
  const score = atsData?.overall ?? 0;

  useEffect(() => {
    const timer = window.setTimeout(() => setAnimatedScore(score), 150);
    return () => window.clearTimeout(timer);
  }, [score]);

  if (!analysisData || !atsData) {
    return (
      <div className="space-y-6 animate-fade-in max-w-5xl">
        <AnalysisEmptyState message="Upload a resume to see your ATS performance dashboard." />
      </div>
    );
  }

  const { breakdown, strengths, improvements } = atsData;
  const providerUsed = analysisData.provider_used || "auto";
  const strokeDashoffset = CIRCUMFERENCE - (animatedScore / 100) * CIRCUMFERENCE;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">ATS Performance Audit</h1>
          <p className="text-muted-foreground mt-1">
            Analyze scoring bottlenecks and check actionable suggestions to optimize resume matching.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1.5 py-1">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> Overall Match Rank: {getRankLabel(score)}
          </Badge>
          <Badge variant="outline" className="gap-1.5 py-1">
            <Cpu className="h-3.5 w-3.5" aria-hidden="true" /> {providerUsed}
            {analysisData.fallback_used ? " · fallback used" : ""}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Match Strength</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="relative h-[220px] w-[220px]">
              <svg width="220" height="220" viewBox="0 0 220 220" className="-rotate-90" aria-hidden="true">
                <circle cx="110" cy="110" r={RADIUS} fill="none" strokeWidth="14" className="stroke-muted" />
                <circle
                  cx="110"
                  cy="110"
                  r={RADIUS}
                  fill="none"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={strokeDashoffset}
                  className={cn("stroke-current transition-[stroke-dashoffset] duration-700 ease-out", scoreTone(score))}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-semibold tabular-nums text-foreground">{animatedScore}</span>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Score</span>
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground">{getScoreDescriptor(score)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Criteria Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {breakdown.map((item) => {
              const pct = item.max_score > 0 ? Math.round((item.score / item.max_score) * 100) : 0;
              const Icon = ICONS[item.icon] ?? HelpCircle;
              return (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> {item.name}
                    </span>
                    <span className="text-sm tabular-nums text-muted-foreground">{item.score}/{item.max_score}</span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${item.name} score`}
                  >
                    <div className={cn("h-full rounded-full", barTone(pct))} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{item.explanation}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Audited Strengths</CardTitle>
            <Badge className="bg-success/10 text-success border-success/20" variant="outline">{strengths.length} Passed</Badge>
          </CardHeader>
          <CardContent>
            {strengths.length > 0 ? (
              <ul className="space-y-3">
                {strengths.map((str) => (
                  <li key={str} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="text-foreground">{str}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No specific strengths detected. Upload a more detailed resume.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Actionable Improvements</CardTitle>
            <Badge className="bg-warning/10 text-warning border-warning/20" variant="outline">{improvements.length} Flagged</Badge>
          </CardHeader>
          <CardContent>
            {improvements.length > 0 ? (
              <Accordion type="single" collapsible>
                {improvements.map((imp, idx) => (
                  <AccordionItem key={imp} value={`imp-${idx}`}>
                    <AccordionTrigger className="text-left text-sm">{imp}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">{imp}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <p className="text-sm text-muted-foreground">No improvements needed — great resume!</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AtsReport;
