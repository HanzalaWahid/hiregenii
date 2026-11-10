import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

import { toast } from 'react-toastify';

import { useState } from 'react';
import {
  FileText,
  Shield,
  Briefcase,
  TrendingUp,
  Info,
  CheckCircle,
  AlertCircle,
  Calendar,
  ExternalLink,
  ArrowRight,
  Eye,
  Upload,
  Clock,
  XCircle,
  Loader2,
  Brain,
  Target,
  Activity,
  Building,
  ChevronRight
} from 'lucide-react';
import { apiJson } from '@/services/api';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

const SeekerDashboard = () => {
  const queryClient = useQueryClient();
  const [selectedAppForXAI, setSelectedAppForXAI] = useState<any>(null);
  const { data: me, isLoading: authLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiJson<any>('/auth/me'),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  const { data: latestCv } = useQuery({
    queryKey: ['cv', 'my', 'latest'],
    queryFn: () => apiJson<any>('/cv/my/latest'),
    retry: false,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => apiJson<any[]>('/jobs'),
    staleTime: 1000 * 60 * 1, // 1 minute
  });
  const { data: applications, isLoading: appsLoading } = useQuery({
    queryKey: ['applications', 'my'],
    queryFn: () => apiJson<any[]>('/applications/my'),
    staleTime: 1000 * 30, // 30 seconds
  });
  const { data: profile } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => apiJson<any>('/profile/me'),
  });

  const isLoading = appsLoading || authLoading;

  const hasCv = Boolean(latestCv && latestCv.candidate_id);
  const hasSkills = Boolean(profile?.skills && profile.skills.length > 0);
  const hasExperience = Boolean(profile?.experience && profile.experience.length > 0);
  const hasEducation = Boolean(profile?.education && profile.education.length > 0);

  let profileCompletion = 20; // Registration
  if (hasCv) profileCompletion += 40;
  if (hasSkills) profileCompletion += 15;
  if (hasExperience) profileCompletion += 15;
  if (hasEducation) profileCompletion += 10;

  const stats = [
    {
      label: 'Profile Completion',
      value: `${profileCompletion}%`,
      icon: FileText,
      color: 'text-primary',
      description: hasCv ? 'Excellent' : 'Incomplete'
    },
    {
      label: 'Jobs Applied',
      value: applications ? String(applications.length) : '0',
      icon: Briefcase,
      color: 'text-blue-500',
      description: 'Active applications'
    },
    {
      label: 'CV Status',
      value: hasCv ? 'Uploaded' : 'Not Uploaded',
      icon: hasCv ? CheckCircle : AlertCircle,
      color: hasCv ? 'text-green-500' : 'text-amber-500',
      description: hasCv ? 'Ready for screening' : 'Action required'
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading your dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Welcome back!</h1>
        <p className="text-muted-foreground mt-1">
          Here's an overview of your profile and job search progress.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`rounded-xl bg-secondary p-3 ${stat.color} bg-opacity-10`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Profile Completion Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile Completion</CardTitle>
          <CardDescription>
            Complete your profile to improve your visibility to recruiters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{profileCompletion}% Complete</span>
            <Badge variant="secondary">
              {profileCompletion >= 80 ? 'Strong' : 'Needs Work'}
            </Badge>
          </div>
          <Progress value={profileCompletion} className="h-2" />
          <div className="flex gap-2 pt-2">
            <Link to="/seeker/profile">
              <Button variant="outline" size="sm">
                Complete Profile
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Anonymization Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Anonymization Status</CardTitle>
              <CardDescription>
                Your identity is protected during the screening process
              </CardDescription>
            </div>
            <Badge
              className={
                hasCv
                  ? 'bg-success/10 text-success border-success/20'
                  : 'bg-warning/10 text-warning border-warning/20'
              }
              variant="outline"
            >
              {hasCv ? 'Active' : 'Pending'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4 rounded-lg bg-secondary/50 p-4">
            <Eye className="h-5 w-5 text-accent mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Your Candidate ID: {latestCv?.candidate_id ?? '—'}
              </p>
              <p className="text-sm text-muted-foreground">
                Recruiters see only your skills, experience summary, and education level—not your name,
                university, or contact information—until they choose to reveal your identity.
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Link to="/seeker/generalized-cv">
              <Button variant="outline" size="sm">
                <Eye className="mr-2 h-4 w-4" />
                View Generalized CV
              </Button>
            </Link>
            <Link to="/seeker/cv-upload">
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Upload New CV
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>


      {/* Pending Reveal Requests */}
      {applications?.some((app: any) => app.reveal_status === 'pending') && (
        <Card className="border-warning bg-warning/5 animate-pulse">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-warning" />
              <CardTitle className="text-lg">Identity Reveal Requests</CardTitle>
            </div>
            <CardDescription>
              Recruiters are interested in your profile and have requested full access to your details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {applications.filter((app: any) => app.reveal_status === 'pending').map((app: any) => (
              <div key={app.id} className="flex items-center justify-between p-4 rounded-lg bg-background border border-warning/20">
                <div>
                  <p className="font-semibold">{app.job_title}</p>
                  <p className="text-sm text-muted-foreground">Request received on {new Date(app.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-success hover:bg-success/90"
                    onClick={async () => {
                      try {
                        await apiJson(`/applications/${app.id}/respond-reveal`, {
                          method: 'POST',
                          body: JSON.stringify({ approved: true })
                        });
                        toast.success("Profile access approved!");
                        queryClient.invalidateQueries({ queryKey: ['applications'] });
                      } catch (e) {
                        toast.error("Failed to approve");
                      }
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await apiJson(`/applications/${app.id}/respond-reveal`, {
                          method: 'POST',
                          body: JSON.stringify({ approved: false })
                        });
                        toast.info("Profile access rejected");
                        queryClient.invalidateQueries({ queryKey: ['applications'] });
                      } catch (e) {
                        toast.error("Failed to reject");
                      }
                    }}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* My Applications Section */}
      
        <CardHeader>
          <CardTitle className="text-lg">My Applications</CardTitle>
          <CardDescription>Track your applications and view AI-generated feedback for each decision</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!applications || applications.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p>You haven't applied to any jobs yet.</p>
              </div>
            ) : (
              applications.map((app: any) => (
                <div key={app.id} className="border border-border rounded-lg p-4 space-y-3 bg-card/50">
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-base">{app.job_title}</h3>
                      <p className="text-xs text-muted-foreground">Applied {new Date(app.created_at).toLocaleDateString()} · Score: {app.score?.toFixed(1) ?? '—'}/100</p>
                    </div>
                    <Badge
                      className={`capitalize ${app.status === 'shortlisted' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                          app.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                            'bg-secondary text-secondary-foreground'
                        }`}
                      variant="outline"
                    >
                      {app.status === 'shortlisted' ? (
                        <CheckCircle className="mr-1 h-3 w-3" />
                      ) : app.status === 'rejected' ? (
                        <XCircle className="mr-1 h-3 w-3" />
                      ) : (
                        <Clock className="mr-1 h-3 w-3" />
                      )}
                      {app.status}
                    </Badge>
                  </div>

                  {/* Premium XAI Reason Section */}
                  <div className="bg-gradient-to-br from-accent/5 to-secondary/5 p-4 rounded-xl border border-accent/10 space-y-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                      <TrendingUp className="h-12 w-12 text-accent" />
                    </div>
                    
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-accent/20 text-accent">
                          <Brain className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-accent uppercase tracking-widest">AI Decision Insight</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Explainable AI Analysis</p>
                        </div>
                      </div>
                      
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-xs text-accent hover:bg-accent/10 h-7"
                        onClick={() => setSelectedAppForXAI(app)}
                      >
                        <Info className="h-3 w-3 mr-1" />
                        Explore Full Analysis
                      </Button>
                    </div>

                    <div className="space-y-2 relative z-10">
                      <p className="text-sm leading-relaxed text-foreground/90 italic">
                        "{app.reason}"
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
  {/* Recommended Jobs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recommended Jobs</CardTitle>
              <CardDescription>Based on your skills and preferences</CardDescription>
            </div>
            <Link to="/seeker/jobs">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(jobs ?? [])
              .filter(job => !applications?.some((app: any) => app.job_id === job.id))
              .slice(0, 3)
              .map((job: any) => (
              <div
                key={job.id}
                className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-secondary/30 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{job.title}</p>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Shield className="h-3.5 w-3.5 text-accent" />
                      <span>{job.company_name || 'Independent Recruiter'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Link to="/seeker/jobs">
                    <Button size="sm" variant="outline" className="hover:bg-primary hover:text-white transition-all">
                      Apply Now
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
            {(jobs ?? []).filter(job => !applications?.some((app: any) => app.job_id === job.id)).length === 0 && (
              <div className="text-center py-6 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                <p className="text-sm">No new recommendations at the moment.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      {/* XAI Explanation Modal */}
      <Dialog open={!!selectedAppForXAI} onOpenChange={() => setSelectedAppForXAI(null)}>
        <DialogContent className="max-w-2xl bg-card border-accent/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Brain className="h-6 w-6 text-accent" />
              AI Decision Explanation
            </DialogTitle>
            <DialogDescription>
              Why the AI made this hiring recommendation for {selectedAppForXAI?.job_title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Decision & Score */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-accent/5 border border-accent/10">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${selectedAppForXAI?.status === 'shortlisted' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                  {selectedAppForXAI?.status === 'shortlisted' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-tight">Decision: {selectedAppForXAI?.status?.toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">Match Score: {selectedAppForXAI?.score}/100</p>
                </div>
              </div>
            </div>

            {/* AI Reason Box */}
            <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-2">
              <div className="flex items-center gap-2 text-accent">
                <Info className="h-4 w-4" />
                <span className="text-xs font-bold uppercase">AI Rationale</span>
              </div>
              <p className="text-sm italic leading-relaxed text-foreground/80">
                "{selectedAppForXAI?.reason}"
              </p>
            </div>

            {/* Score Breakdown Bars */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Score Breakdown
              </h4>
              <div className="grid gap-4">
                {[
                  { label: 'Experience', key: 'experience', max: 30 },
                  { label: 'Skills Match', key: 'skills', max: 25 },
                  { label: 'Project Portfolio', key: 'projects', max: 20 },
                  { label: 'Certifications', key: 'certifications', max: 15 },
                  { label: 'Academic (4.0 Scale)', key: 'cgpa', max: 10 }
                ].map((item) => {
                  const val = selectedAppForXAI?.score_breakdown?.[item.key] || 0;
                  const percent = (val / item.max) * 100;
                  return (
                    <div key={item.key} className="space-y-1.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-medium text-muted-foreground">{item.label}</span>
                        <span className="font-bold">{val.toFixed(1)} / {item.max.toFixed(1)}</span>
                      </div>
                      <Progress value={percent} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator className="opacity-50" />

            <div className="grid grid-cols-2 gap-6">
              {/* Missing Skills */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Skill Gaps
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAppForXAI?.missing_skills?.length > 0 ? (
                    selectedAppForXAI.missing_skills.map((s: string) => (
                      <Badge key={s} variant="outline" className="text-[10px] text-destructive border-destructive/20 bg-destructive/5">{s}</Badge>
                    ))
                  ) : (
                    <p className="text-[10px] text-muted-foreground italic">No major gaps identified.</p>
                  )}
                </div>
              </div>

              {/* Suggestions */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Improvement Tips
                </h4>
                <div className="space-y-2">
                  {selectedAppForXAI?.suggestions?.map((s: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground leading-tight">
                      <CheckCircle className="h-3 w-3 text-accent flex-shrink-0 mt-0.5" />
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SeekerDashboard;
