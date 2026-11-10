import { useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Briefcase } from 'lucide-react';
import { apiJson } from '@/services/api';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Info,
  User,
  GraduationCap,
  Mail,
  MapPin,
  Loader2,
  Shield,
} from 'lucide-react';
import { apiUpload } from '@/services/api';

type UploadStatus = 'idle' | 'uploading' | 'parsing' | 'complete';

type UploadCvResponse = {
  candidate_id: number;
  toggle_view: 'normal' | 'anonymized';
  cv: {
    filename: string;
    original_text: string;
    anonymized_text: string;
    removed: {
      name: boolean;
      email: boolean;
      phone: boolean;
      institute: boolean;
    };
  };
  extracted: {
    skills: string[];
    experience_years: number;
    projects_count: number;
    certifications_count: number;
    cgpa: number | null;
    education_institute: string | null;
  };
  scoring: {
    score: number;
    skills_matched: string[];
    missing_skills: string[];
  };
};

const CVUpload = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('job_id');
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState<string>('');
  const [fairMode, setFairMode] = useState(true);
  const [result, setResult] = useState<UploadCvResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: latestCv, isLoading: isCheckingCv } = useQuery({
    queryKey: ['myLatestCv'],
    queryFn: () => apiJson<UploadCvResponse>('/cv/my/latest'),
    retry: false,
  });

  const [showChoice, setShowChoice] = useState(true);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const url = jobId 
        ? `/cv/upload?job_id=${jobId}&fair_mode=${fairMode}`
        : `/cv/upload?fair_mode=${fairMode}`;
      return apiUpload<UploadCvResponse>(url, form);
    },
    onMutate: () => {
      setErrorMessage(null);
      setResult(null);
      setUploadStatus('uploading');
      setUploadProgress(20);
    },
    onSuccess: (data) => {
      setUploadStatus('complete');
      setUploadProgress(100);
      setResult(data);
      // Invalidate queries for instant 100% completion
      queryClient.invalidateQueries({ queryKey: ['cv', 'my', 'latest'] });
      queryClient.invalidateQueries({ queryKey: ['myLatestCv'] });
    },
    onError: (err: any) => {
      setUploadStatus('idle');
      setUploadProgress(0);
      setErrorMessage(typeof err?.message === 'string' ? err.message : 'Upload failed. Please try again.');
    },
  });

  const applyCurrentMutation = useMutation({
    mutationFn: async () => {
      return apiJson(`/cv/apply-current?job_id=${jobId}`, { method: 'POST' });
    },
    onSuccess: () => {
      navigate('/seeker/dashboard');
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to apply with current CV');
    }
  });

  const sensitiveFields = useMemo(() => {
    const removed = result?.cv.removed;
    const instituteValue = result?.extracted.education_institute;

    return [
      {
        icon: User,
        label: 'Name',
        value: removed?.name ? '[HIDDEN]' : '—',
        detected: Boolean(removed?.name),
        reason: 'Names can reveal gender, ethnicity, or cultural background, potentially leading to unconscious bias.',
      },
      {
        icon: GraduationCap,
        label: 'University / Institute',
        value: removed?.institute ? '[HIDDEN]' : instituteValue || '—',
        detected: Boolean(removed?.institute || instituteValue),
        reason: 'Institution names can create prestige bias, favoring candidates from well-known schools regardless of actual qualifications.',
      },
      {
        icon: Mail,
        label: 'Email',
        value: removed?.email ? '[HIDDEN]' : '—',
        detected: Boolean(removed?.email),
        reason: 'Email addresses can sometimes reveal identity, location, or demographic signals.',
      },
      {
        icon: MapPin,
        label: 'Phone',
        value: removed?.phone ? '[HIDDEN]' : '—',
        detected: Boolean(removed?.phone),
        reason: 'Phone numbers can reveal location and identity, and should be hidden during early-stage screening.',
      },
      {
        icon: Shield,
        label: 'Nationality',
        value: (removed as any)?.nationality ? '[HIDDEN]' : '—',
        detected: Boolean((removed as any)?.nationality),
        reason: 'Nationality can lead to ethnic or national origin bias in the selection process.',
      },
      {
        icon: User,
        label: 'Gender',
        value: (removed as any)?.gender ? '[HIDDEN]' : '—',
        detected: Boolean((removed as any)?.gender),
        reason: 'Gender bias is a common issue in recruitment. Hiding it ensures merit-based evaluation.',
      },
      {
        icon: Briefcase,
        label: 'Organization',
        value: (removed as any)?.organization ? '[HIDDEN]' : '—',
        detected: Boolean((removed as any)?.organization),
        reason: 'Company names can create pedigree bias, favoring candidates from specific top-tier firms.',
      },
    ];
  }, [result]);

  const hiddenCount = sensitiveFields.filter((f) => f.detected).length;

  const openFilePicker = () => fileInputRef.current?.click();

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    setUploadStatus('parsing');
    setUploadProgress(40);
    uploadMutation.mutate(file);
  };

  if (jobId && latestCv && showChoice && !result && uploadStatus === 'idle') {
    return (
      <div className="space-y-6 animate-fade-in max-w-4xl">
        <Card className="border-accent/50 bg-accent/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Briefcase className="h-6 w-6 text-accent" />
              </div>
              <div>
                <CardTitle>Apply for Position</CardTitle>
                <CardDescription>We found an existing CV in your profile.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="h-32 flex flex-col gap-3 border-2 hover:border-accent hover:bg-accent/5"
                onClick={() => setShowChoice(false)}
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-semibold">Upload New CV</p>
                  <p className="text-xs text-muted-foreground">Replace your existing profile</p>
                </div>
              </Button>

              <Button 
                className="h-32 flex flex-col gap-3 border-2 border-accent"
                onClick={() => applyCurrentMutation.mutate()}
                disabled={applyCurrentMutation.isPending}
              >
                {applyCurrentMutation.isPending ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <FileText className="h-8 w-8" />
                )}
                <div className="text-center">
                  <p className="font-semibold">Use Current CV</p>
                  <p className="text-xs opacity-80">{latestCv.cv.filename}</p>
                </div>
              </Button>
            </div>

            <Alert className="bg-background">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Using your current CV will preserve your existing anonymization settings and analysis results.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">CV Upload & Analysis</h1>
        <p className="text-muted-foreground mt-1">
          Upload your CV to begin the anonymization process
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Upload Your CV</CardTitle>
              <CardDescription>Supported formats: PDF, DOCX, TXT (Max 5MB)</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium leading-none">Fair mode</p>
                <p className="text-xs text-muted-foreground mt-1">Hide institute to reduce prestige bias</p>
              </div>
              <Switch checked={fairMode} onCheckedChange={setFairMode} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop Zone */}
          <div
            onClick={openFilePicker}
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">Click to upload or drag and drop</p>
            <p className="text-sm text-muted-foreground mt-1">PDF, DOCX, or TXT up to 5MB</p>
          </div>

          {/* Upload Progress */}
          {(uploadStatus === 'uploading' || uploadStatus === 'parsing') && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium flex-1">{fileName || 'Uploading...'}</span>
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
              </div>
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {uploadStatus === 'uploading' ? 'Uploading to analyzer...' : 'Analyzing and extracting data...'}
              </p>
            </div>
          )}

          {/* Complete State */}
          {uploadStatus === 'complete' && result && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/20">
              <CheckCircle className="h-5 w-5 text-success" />
              <div className="flex-1">
                <p className="font-medium text-success">CV uploaded successfully</p>
                <p className="text-sm text-muted-foreground">
                  {result.cv.filename} • Candidate ID: {result.candidate_id}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={openFilePicker}>
                Replace
              </Button>
              <Button size="sm" onClick={() => navigate('/seeker/jobs')}>
                Return to Jobs
              </Button>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-destructive">Upload failed</p>
                <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
              </div>
              <Button variant="outline" size="sm" onClick={openFilePicker}>
                Try again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sensitive Attributes Detection */}
      {uploadStatus === 'complete' && result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <EyeOff className="h-5 w-5 text-accent" />
                <CardTitle className="text-lg">Detected Sensitive Information</CardTitle>
              </div>
              <Badge className="bg-success/10 text-success border-success/20" variant="outline">
                {hiddenCount} Field{hiddenCount === 1 ? '' : 's'} Hidden
              </Badge>
            </div>
            <CardDescription>
              The following information has been detected and will be hidden from recruiters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sensitiveFields.map((field) => (
              <div
                key={field.label}
                className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/30"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-background">
                    <field.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{field.label}</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {field.value}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={field.detected ? 'secondary' : 'outline'} className="gap-1">
                    <EyeOff className="h-3 w-3" />
                    {field.detected ? 'Hidden' : 'Not found'}
                  </Badge>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p className="text-sm">{field.reason}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Explanation Alert */}
      <Alert className="border-accent/30 bg-accent/5">
        <Eye className="h-4 w-4 text-accent" />
        <AlertTitle className="text-accent">Why is this information hidden?</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Research shows that personal identifiers like names, photos, and educational institutions 
          can lead to unconscious bias in hiring decisions. By hiding this information during initial 
          screening, recruiters can focus purely on your skills and qualifications, leading to fairer 
          evaluation. Your full details are only revealed after you've been shortlisted based on merit.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default CVUpload;
