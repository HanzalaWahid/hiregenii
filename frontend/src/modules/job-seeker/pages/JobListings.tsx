import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
import { Search, Filter, Briefcase, Clock, Users, CheckCircle } from 'lucide-react';
import { apiJson } from '@/services/api';

const JobListings = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [experienceFilter, setExperienceFilter] = useState<string>('all');
  const { data: myApplications } = useQuery({
    queryKey: ['myApplications'],
    queryFn: () => apiJson<any[]>('/applications/my'),
  });

  const appliedJobs = new Set((myApplications ?? []).map(app => String(app.job_id)));

  const { data } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => apiJson<any[]>('/jobs'),
  });

  const jobs = data ?? [];

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.required_skills ?? []).some((s: any) => 
        (typeof s === 'string' ? s : s.skill).toLowerCase().includes(searchQuery.toLowerCase())
      );
    // Backend jobs don't have experience levels; keep filter UI but treat as no-op for now.
    const matchesExperience = experienceFilter === 'all';
    return matchesSearch && matchesExperience;
  });

  const navigate = useNavigate();

  const handleApply = (jobId: number) => {
    navigate(`/seeker/cv-upload?job_id=${jobId}`);
  };


  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Job Listings</h1>
        <p className="text-muted-foreground mt-1">
          Find opportunities that match your skills
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title or skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={experienceFilter} onValueChange={setExperienceFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Experience Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="entry">Entry Level</SelectItem>
                <SelectItem value="mid">Mid Level</SelectItem>
                <SelectItem value="senior">Senior Level</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''}
      </p>

      {/* Job Cards */}
      <div className="grid gap-4">
        {filteredJobs.map((job) => {
          const isApplied = appliedJobs.has(String(job.id));

          return (
            <Card key={job.id} className="hover:shadow-academic-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{job.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Briefcase className="h-4 w-4" />
                      {`Job ID: ${job.id}`}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="capitalize bg-accent/10 text-accent border-accent/20">
                    Open
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{job.description}</p>

                {/* Required Skills */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Required Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {(job.required_skills ?? []).map((skill: any, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        {typeof skill === 'string' ? skill : skill.skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Job Meta */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Recently posted
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      —
                    </span>
                  </div>
                  
                  {isApplied ? (
                    <Button variant="outline" disabled className="gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      Applied
                    </Button>
                  ) : (
                    <Button onClick={() => handleApply(job.id)}>
                      Apply Now
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>


      {filteredJobs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium">No jobs found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your search or filters
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default JobListings;
