import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Search,
  Filter,
  ArrowUpDown,
  CheckSquare,
  Eye,
  Hash,
  GraduationCap,
  TrendingUp,
  Info,
  Loader2,
  Briefcase,
  Shield,
  ChevronRight,
  ArrowLeft,
  XCircle
} from 'lucide-react';
import { apiJson } from '@/services/api';

import { useQuery, useQueryClient } from '@tanstack/react-query';

const CandidateScreening = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('job_id');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'match' | 'experience'>('match');

  // Fetch all jobs for selection
  const { data: myJobs } = useQuery({
    queryKey: ['my-jobs'],
    queryFn: () => apiJson<any[]>('/jobs/my'),
    staleTime: 60000,
  });

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: ['candidates', jobId],
    queryFn: () => apiJson<any>(`/rank/${jobId}`),
    enabled: !!jobId,
    staleTime: 60000,
  });

  const candidates = data?.top_5 || [];
  const loading = isLoading;
  const error = queryError ? (queryError as any).message : (jobId ? null : 'No job selected');

  const selectedJob = myJobs?.find(j => j.id.toString() === jobId);

  const handleShortlist = async (candidateId: string) => {
    try {
      await apiJson<any>(`/rank/${jobId}/shortlist/${candidateId}`, { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: ['candidates', jobId] });
      queryClient.invalidateQueries({ queryKey: ['shortlistedCandidates'] });
    } catch (e) {
      console.error("Failed to toggle shortlist", e);
    }
  };

  if (!jobId) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Select a Job</h1>
            <p className="text-muted-foreground mt-1">
              Choose one of your active listings to start screening candidates
            </p>
          </div>
          <Link to="/recruiter/dashboard">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myJobs?.map((job) => (
            <Card 
              key={job.id} 
              className="hover:shadow-academic-lg transition-all cursor-pointer group border-transparent hover:border-accent/30"
              onClick={() => navigate(`/recruiter/candidates?job_id=${job.id}`)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="p-2 rounded-lg bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white transition-colors">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary">{job.applicantCount || 0} applicants</Badge>
                </div>
                <CardTitle className="mt-4 line-clamp-1">{job.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {job.experience_level.toUpperCase()} LEVEL • {job.required_skills.length} skills required
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full justify-between group-hover:bg-accent group-hover:text-white transition-all">
                  View Candidates
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          {(!myJobs || myJobs.length === 0) && (
            <div className="col-span-full py-12 text-center bg-secondary/30 rounded-xl border-2 border-dashed border-muted-foreground/20">
              <p className="text-muted-foreground font-medium">You haven't posted any jobs yet.</p>
              <Link to="/recruiter/dashboard" className="mt-4 inline-block">
                <Button>Create your first job post</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredCandidates = candidates
    .filter((c) =>
      c.candidate_id.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.skills.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'match') {
        return b.score - a.score;
      }
      return 0;
    });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {selectedJob ? `Screening for ${selectedJob.title}` : 'Candidate Screening'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Review anonymized candidate profiles based on skills and experience
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate('/recruiter/candidates')}
          className="w-fit"
        >
          <ArrowUpDown className="h-4 w-4 mr-2" />
          Change Job
        </Button>
      </div>

      {/* Anonymization Notice */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-accent/10 border border-accent/20">
        <Eye className="h-5 w-5 text-accent flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm">
            <span className="font-medium text-accent">Anonymized Stage: </span>
            <span className="text-muted-foreground">
              Candidate identities are hidden. Focus on skills and qualifications for unbiased evaluation.
            </span>
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by ID or skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'match' | 'experience')}>
              <SelectTrigger className="w-full sm:w-40">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="match">Match %</SelectItem>
                <SelectItem value="experience">Experience</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {error && <p className="text-destructive">{error}</p>}
      <p className="text-sm text-muted-foreground">
        {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''} found
      </p>

      {/* Candidate Cards */}
      <div className="grid gap-4">
        {filteredCandidates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Hash className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No candidates available yet</p>
          </div>
        ) : (
          filteredCandidates.map((candidate) => (
            <Card
              key={candidate.candidate_id}
              className={`hover:shadow-academic-md transition-all ${
                candidate.isShortlisted ? 'ring-1 ring-accent' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  {/* Candidate Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-secondary-foreground font-mono text-lg flex-shrink-0">
                      <Hash className="h-5 w-5 mr-0.5" />
                      {candidate.candidate_id.slice(-3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">Candidate {candidate.candidate_id}</p>
                        {candidate.isShortlisted && (
                          <Badge className="bg-accent/10 text-accent border-accent/20" variant="outline">
                            Shortlisted
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <GraduationCap className="h-4 w-4" />
                          {candidate.education_level}
                        </span>
                        <span>{candidate.experience_years} years experience</span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {candidate.company || 'N/A'}
                        </span>
                      </div>

                      {/* Skills */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {candidate.skills.map((skill: string) => (
                          <Badge key={skill} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Match Score & Actions */}
                  <div className="flex flex-col items-center gap-3 lg:items-end">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-success" />
                      <span className="text-2xl font-bold text-success">
                        {candidate.score}%
                      </span>
                      <span className="text-sm text-muted-foreground">match</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={candidate.isShortlisted ? 'secondary' : 'default'}
                        onClick={() => handleShortlist(candidate.candidate_id)}
                      >
                        <CheckSquare className="h-4 w-4 mr-2" />
                        {candidate.isShortlisted ? 'Shortlisted' : 'Shortlist'}
                      </Button>
                      
                      {!candidate.isShortlisted && candidate.status !== 'rejected' && (
                        <Button 
                          variant="ghost" 
                          className="text-destructive hover:bg-destructive/10"
                          onClick={async () => {
                            if (!candidate.id) return;
                            try {
                              await apiJson(`/applications/${candidate.id}/reject`, { method: 'POST' });
                              queryClient.invalidateQueries({ queryKey: ['candidates', jobId] });
                              toast.info("Candidate rejected and notified.");
                            } catch (e) {
                              toast.error("Failed to reject candidate");
                            }
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      )}

                      {candidate.status === 'rejected' && (
                        <Button 
                          variant="outline" 
                          className="text-amber-600 border-amber-200 hover:bg-amber-50"
                          onClick={async () => {
                            if (!candidate.id) return;
                            try {
                              await apiJson(`/applications/${candidate.id}/reject`, { method: 'POST' });
                              toast.success("XAI Rejection details sent to candidate!");
                            } catch (e) {
                              toast.error("Failed to send notification");
                            }
                          }}
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Notify Reject
                        </Button>
                      )}
                      
                      {candidate.isShortlisted && (
                        <Button 
                          variant="outline" 
                          className="border-accent text-accent hover:bg-accent/10"
                          onClick={async () => {
                            if (!candidate.id) return;
                            try {
                              await apiJson(`/applications/${candidate.id}/request-reveal`, { method: 'POST' });
                              toast.success("Access request sent to candidate!");
                            } catch (e) {
                              toast.error("Failed to send request");
                            }
                          }}
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Request Access
                        </Button>
                      )}

                      <Link to={`/recruiter/candidate/${candidate.candidate_id}?job_id=${jobId}`}>
                        <Button variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default CandidateScreening;
