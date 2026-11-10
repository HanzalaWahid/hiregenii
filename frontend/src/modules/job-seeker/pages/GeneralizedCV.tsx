import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { User } from 'lucide-react';
import {
  Download,
  Eye,
  Shield,
  GraduationCap,
  Briefcase,
  Code,
  Hash,
  Loader2,
  FileText,
  Upload,
  Info,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { apiJson } from '@/services/api';
import { Link } from 'react-router-dom';
import { useState } from 'react';


const GeneralizedCV = () => {
  const [showAnonymized, setShowAnonymized] = useState(true);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['cv', 'my', 'latest'],
    queryFn: () => apiJson<any>('/cv/my/latest'),
    retry: false,
  });

  const reprocessMutation = useMutation({
    mutationFn: () => apiJson<any>('/cv/re-process', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cv', 'my', 'latest'] });
    },
  });

  const handleDownload = () => {
    // ATS Format Download (Clean Text)
    const cvText = showAnonymized ? data?.cv?.anonymized_text : data?.cv?.original_text;
    if (!cvText) return;

    const blob = new Blob([cvText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CV_Candidate_${data?.candidate_id}_${showAnonymized ? 'Anonymized' : 'Original'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl print:max-w-none print:m-0 print:p-0">
      <div className="flex items-start justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">CV Viewer</h1>
          <p className="text-muted-foreground mt-1">
            Toggle between your original CV and the generalized version recruiters see
          </p>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center space-x-2 bg-secondary/50 p-2 rounded-lg border border-border">
            <Label htmlFor="view-mode" className="text-sm font-medium">Anonymized View</Label>
            <Switch 
              id="view-mode" 
              checked={showAnonymized} 
              onCheckedChange={setShowAnonymized} 
            />
          </div>
          <Button onClick={handleDownload} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download ATS Format
          </Button>
          <Button
            onClick={() => reprocessMutation.mutate()}
            variant="secondary"
            className="gap-2"
            disabled={reprocessMutation.isPending}
            title="Re-runs anonymization and skill extraction on your existing CV using the latest pipeline"
          >
            {reprocessMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <RefreshCw className="h-4 w-4" />}
            {reprocessMutation.isPending ? 'Processing…' : 'Re-process CV'}
          </Button>
        </div>
      </div>

      {showAnonymized && (
        <div className="flex items-center gap-4 p-4 rounded-lg bg-accent/10 border border-accent/20 print:hidden">
          <Shield className="h-6 w-6 text-accent flex-shrink-0" />
          <div>
            <p className="font-medium text-accent">Identity Protected View</p>
            <p className="text-sm text-muted-foreground">
              Personal identifiers like name, contact info, university, and organization names have been redacted to ensure fair evaluation.
            </p>
          </div>
        </div>
      )}

      {/* CV Preview Card */}
      <Card className="overflow-hidden shadow-academic-lg">
        <CardHeader className={`${showAnonymized ? 'bg-primary' : 'bg-secondary'} text-foreground transition-colors duration-300`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${showAnonymized ? 'bg-primary-foreground/10' : 'bg-background'}`}>
              {showAnonymized ? <Shield className="h-6 w-6 text-primary-foreground" /> : <User className="h-6 w-6" />}
            </div>
            <div>
              <CardTitle className={`text-xl ${showAnonymized ? 'text-primary-foreground' : 'text-foreground'}`}>
                {showAnonymized ? `Candidate ${data?.candidate_id ?? '—'}` : 'Original CV View'}
              </CardTitle>
              <CardDescription className={showAnonymized ? 'text-primary-foreground/70' : 'text-muted-foreground'}>
                {showAnonymized ? 'Anonymized for Bias-Aware Screening' : 'Full Profile Information'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-8">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Preparing your CV profile…</p>
            </div>
          )}
          {(!isLoading && (!data || error)) && (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No CV data found</p>
                <p className="text-sm text-muted-foreground">
                  Please upload your CV first to see the analysis.
                </p>
              </div>
              <Link to="/seeker/cv-upload">
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload CV
                </Button>
              </Link>
            </div>
          )}

          {!isLoading && !error && data && (
            <div className="space-y-8">
              {/* Text Content */}
              <div className="space-y-4">
                 <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-accent" />
                    <h3 className="font-bold text-lg">CV Content</h3>
                 </div>
                 <div className="p-6 rounded-xl bg-secondary/30 border border-border/50 font-mono text-sm leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                    {showAnonymized ? data.cv.anonymized_text : data.cv.original_text}
                 </div>
              </div>

              {showAnonymized && (
                <>
                  <Separator />
                  
                  {/* Extracted Insights Section */}
                  <div className="grid gap-8 md:grid-cols-2">
                    {/* Skills Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Code className="h-5 w-5 text-accent" />
                        <h3 className="font-semibold">Professional Skills</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(data?.extracted?.skills ?? []).map((skill: string) => (
                          <Badge key={skill} variant="secondary" className="px-3 py-1 bg-accent/5 text-accent border-accent/20">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Experience Metrics */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-accent" />
                        <h3 className="font-semibold">Professional Summary</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                          <span className="text-sm text-muted-foreground">Experience</span>
                          <span className="font-bold">{Number(data?.extracted?.experience_years ?? 0).toFixed(1)} Years</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                          <span className="text-sm text-muted-foreground">Projects</span>
                          <span className="font-bold">{data?.extracted?.projects?.length || data?.extracted?.projects_count || 0} Total</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                          <span className="text-sm text-muted-foreground">Education (CGPA)</span>
                          <span className="font-bold">{data?.extracted?.cgpa ?? '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Projects Section */}
                  <div className="space-y-4">
                     <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-accent" />
                        <h3 className="font-semibold">Extracted Projects</h3>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {(data?.extracted?.projects ?? []).length > 0 ? (
                           data.extracted.projects.map((proj: any, idx: number) => (
                            <div key={idx} className="p-4 rounded-lg border border-border bg-card hover:border-accent/30 transition-colors">
                              <p className="font-bold text-sm mb-1">{proj.title}</p>
                              <p className="text-xs text-muted-foreground leading-relaxed">{proj.description}</p>
                            </div>
                           ))
                        ) : (
                          <p className="text-sm text-muted-foreground italic col-span-2">No detailed projects extracted.</p>
                        )}
                      </div>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Info */}
      <p className="text-sm text-muted-foreground text-center print:hidden">
        {showAnonymized 
          ? "This view hides identifying information to promote fair hiring." 
          : "This view shows your full original CV content."}
      </p>
    </div>
  );
};

export default GeneralizedCV;
