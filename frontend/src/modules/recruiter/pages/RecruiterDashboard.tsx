import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Briefcase,
  Users,
  CheckSquare,
  ArrowRight,
  Plus,
  TrendingUp,
  Eye,
  Loader2,
} from 'lucide-react';
import { apiJson } from '@/services/api';

import { useQuery } from '@tanstack/react-query';

// Response of POST /jobs/{id}/shortlist-suggestions (advisory only; never changes status).
type ShortlistSuggestionsResponse = {
  message: string;
  processed: number;
  suggested_shortlist: number;
  needs_review: number;
  threshold_used: number;
};

const RecruiterDashboard = () => {
  const { data: jobs = [], isLoading: jobsLoading, error: jobsError } = useQuery({
    queryKey: ['myJobs'],
    queryFn: () => apiJson<any[]>('/jobs/my')
  });

  const { data: shortlisted = [], isLoading: shortlistedLoading } = useQuery({
    queryKey: ['shortlistedCandidates'],
    queryFn: () => apiJson<any[]>('/shortlisted')
  });

  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiJson<any>('/auth/me')
  });

  const loading = jobsLoading || shortlistedLoading || profileLoading;
  const error = jobsError ? (jobsError as any).message : null;

  const stats = [
    {
      label: 'Active Job Posts',
      value: jobs.length,
      icon: Briefcase,
      color: 'text-primary',
    },
    {
      label: 'Total Applicants',
      value: jobs.reduce((acc, job) => acc + (job.applicantCount || 0), 0),
      icon: Users,
      color: 'text-accent',
    },
    {
      label: 'Shortlisted',
      value: shortlisted.length,
      icon: CheckSquare,
      color: 'text-success',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Recruiter Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Review anonymized candidates and build diverse teams
          </p>
        </div>
        <Link to="/recruiter/post-job">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Post New Job
          </Button>
        </Link>
      </div>

      {/* Profile Warning */}
      {!userProfile?.recruiter_profile && (
        <Card className="border-warning/50 bg-warning/5 border-dashed">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-warning/20 p-2">
                <Users className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium">Complete Your Company Profile</p>
                <p className="text-xs text-muted-foreground">Add your company details to start posting jobs and attracting talent.</p>
              </div>
            </div>
            <Link to="/recruiter/profile">
              <Button size="sm" variant="outline" className="border-warning/50 hover:bg-warning/10">
                Complete Profile
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`rounded-lg bg-secondary p-3 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-semibold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Anonymization Info */}
      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="flex items-start gap-4 p-6">
          <Eye className="h-6 w-6 text-accent flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-accent">AI Powered Screening Active</p>
            <p className="text-sm text-muted-foreground">
              All candidates are shown anonymously during initial screening. You'll see only their
              skills, experience summary, and education level—not their names, photos, universities,
              or personal details. This helps ensure fair evaluation based on qualifications alone.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Jobs */}
        <Card className={jobs.length === 0 ? 'lg:col-span-2' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Active Job Posts</CardTitle>
                <CardDescription>Your current open positions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto">
                  <Briefcase className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">No jobs posted yet</p>
                  <p className="text-sm text-muted-foreground">
                    Get started by creating your first job posting.
                  </p>
                </div>
                <Link to="/recruiter/post-job">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Post a Job
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-secondary/30 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{job.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {job.applicantCount || 0} applicants
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className="bg-success/10 text-success border-success/20"
                      >
                        active
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="default"
                        className="bg-accent hover:bg-accent/90"
                        onClick={async () => {
                          try {
                            // Advisory only: the API never changes application status here.
                            const res = await apiJson<ShortlistSuggestionsResponse>(`/jobs/${job.id}/shortlist-suggestions`, { method: 'POST' });
                            if (res.processed === 0) {
                              toast.info(res.message || "No pending applications to review.");
                            } else {
                              toast.success(
                                `AI suggests shortlisting ${res.suggested_shortlist} of ${res.processed} pending applicants. Review them under View; nothing was changed.`
                              );
                            }
                          } catch (e) {
                            toast.error(e instanceof Error && e.message ? e.message : "Could not load AI suggestions");
                          }
                        }}
                      >
                        AI Suggestions
                      </Button>
                      <Link to={`/recruiter/candidates?job_id=${job.id}`}>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {jobs.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <CardDescription>Latest applicant updates</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

    </div>
  );
};

export default RecruiterDashboard;
