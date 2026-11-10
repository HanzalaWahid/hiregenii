import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Briefcase,
  Code,
  CalendarIcon,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Shield,
  Brain,
  XCircle,
  TrendingUp,
  Lightbulb,
} from 'lucide-react';
import { apiJson } from '@/services/api';
import { format } from 'date-fns';

// Inline error component (no external dependency required)
const ErrorAlert = ({ message, title, onRetry }: { message: string; title: string; onRetry?: () => void }) => (
  <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/10">
    <div className="flex items-center gap-2 mb-1">
      <AlertTriangle className="h-4 w-4 text-destructive" />
      <p className="font-medium text-destructive text-sm">{title}</p>
    </div>
    <p className="text-sm text-muted-foreground">{message}</p>
    {onRetry && <Button variant="ghost" size="sm" className="mt-2" onClick={onRetry}>Retry</Button>}
  </div>
);

const CandidateDetail = () => {
  const queryClient = useQueryClient();
  const { candidateId } = useParams();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('job_id') || '1';
  const navigate = useNavigate();
  
  const [data, setData] = useState<any>(null);
  const [biasData, setBiasData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAnonymized, setIsAnonymized] = useState(true);

  const [interviewDate, setInterviewDate] = useState<Date | undefined>();
  const [interviewTime, setInterviewTime] = useState<string>('');
  const [isScheduled, setIsScheduled] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cvRes, biasRes] = await Promise.all([
          apiJson<any>(`/cv/${candidateId}?job_id=${jobId}`),
          apiJson<any>(`/bias-toggle/${candidateId}?job_id=${jobId}`)
        ]);
        setData(cvRes);
        setBiasData(biasRes);
      } catch (err: any) {
        setError(err.message || 'Failed to load candidate details');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [candidateId, jobId]);

  const [meetingLink, setMeetingLink] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  const handleScheduleInterview = async () => {
    if (!interviewDate || !interviewTime || !data?.user_id) {
      toast.error("Required data (Date, Time, or Candidate ID) is missing");
      return;
    }

    const jId = parseInt(jobId);
    const uId = parseInt(data?.user_id);

    if (isNaN(jId) || isNaN(uId)) {
      toast.error("Invalid Job or Candidate ID. Please refresh and try again.");
      return;
    }

    setIsScheduling(true);
    try {
      const [hours, minutes] = interviewTime.split(':');
      const finalDate = new Date(interviewDate);
      finalDate.setHours(parseInt(hours));
      finalDate.setMinutes(parseInt(minutes));
      finalDate.setSeconds(0);
      finalDate.setMilliseconds(0);

      // Robust payload construction
      const payload = {
        job_id: jId,
        user_id: uId,
        scheduled_at: finalDate.toISOString(),
        meeting_link: meetingLink?.trim() || null
      };

      await apiJson('/interviews', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      toast.success("Interview scheduled and candidate notified!");
      setIsScheduled(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule interview");
    } finally {
      setIsScheduling(false);
    }
  };


  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto py-12">
        <ErrorAlert 
          message={error || 'Candidate not found'} 
          title="Data Loading Error"
          onRetry={() => window.location.reload()}
        />
        <Button onClick={() => navigate(-1)} className="mt-4 w-full" variant="ghost">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const candidate = data.cv;
  const extracted = data.extracted;
  const scoring = data.scoring;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Screening
        </Button>
        
        <div className="flex gap-2">
          {!data.is_revealed && (
            <Button
              variant="outline"
              className="border-accent text-accent hover:bg-accent/10"
              onClick={async () => {
                if (!data.id) {
                  toast.error("Application context missing");
                  return;
                }
                try {
                  await apiJson(`/applications/${data.id}/request-reveal`, { method: 'POST' });
                  toast.success("Access request sent to candidate!");
                  queryClient.invalidateQueries({ queryKey: ['cv', candidateId] });
                } catch (e) {
                  toast.error("Failed to send request");
                }
              }}
            >
              <Shield className="h-4 w-4 mr-2" />
              Request Full Access
            </Button>
          )}

          <Button
            variant={isAnonymized ? "outline" : "secondary"}
            onClick={() => {
              if (!data.is_revealed) {
                toast.warning("You need candidate permission to reveal identity.");
                return;
              }
              setIsAnonymized(!isAnonymized);
            }}
            disabled={!data.is_revealed}
            className="gap-2"
          >
            {isAnonymized ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {isAnonymized ? "Reveal Identity" : "Hide Identity"}
          </Button>
        </div>
      </div>

      {/* Bias Detection Notice */}
      {biasData?.bias_detected && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 animate-pulse">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive">Bias Detected in Original Score</p>
            <p className="text-sm text-muted-foreground">
              {biasData.key_insight}. The anonymized score is more representative of skills.
            </p>
          </div>
        </div>
      )}

      {/* Candidate Header */}
      <Card className={isAnonymized ? 'border-dashed border-2' : ''}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className={`flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-semibold flex-shrink-0 ${isAnonymized ? 'bg-secondary text-muted-foreground' : 'bg-primary text-primary-foreground'}`}>
              {isAnonymized ? <User className="h-8 w-8" /> : (candidate.pii?.full_name || '??').split(' ').map((n: string) => n[0]).join('')}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-semibold">
                    {isAnonymized ? `Candidate ${data.candidate_id}` : (candidate.pii?.full_name || 'Full Name')}
                  </h1>
                  <p className="text-muted-foreground">ID: {data.candidate_id}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className="bg-success/10 text-success border-success/20 text-lg py-1 px-3" variant="outline">
                    {isAnonymized ? biasData?.anonymized_view?.score : biasData?.normal_view?.score}% Match
                  </Badge>
                  <Badge variant="secondary" className="capitalize">
                    {isAnonymized ? 'Anonymized View' : 'Revealed View'}
                  </Badge>
                </div>
              </div>
              
              {!isAnonymized && (
                <div className="grid gap-2 sm:grid-cols-2 mt-4 text-sm animate-fade-in">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {candidate.pii?.email || 'N/A'}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {candidate.pii?.phone || 'N/A'}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {candidate.pii?.address || 'N/A'}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GraduationCap className="h-4 w-4" />
                    {candidate.pii?.institute || 'N/A'}
                  </div>
                </div>
              )}
              {isAnonymized && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground bg-secondary/30 p-2 rounded italic">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  Personal details hidden to ensure unbiased evaluation
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* XAI Explainability Panel */}
          <Card className="border-accent/30 bg-accent/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-accent" />
                <CardTitle className="text-lg">AI Match Assessment</CardTitle>
              </div>
              <CardDescription>Advisory only. The hiring decision is always yours.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Decision badge: reflects the recruiter-set application status, not an AI verdict */}
              <div className="flex items-center gap-3">
                {['Selected', 'Shortlisted'].includes(data.explanations?.recruiter?.decision) ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : data.explanations?.recruiter?.decision === 'Rejected' ? (
                  <XCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <Clock className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-semibold text-sm">
                    Decision: {data.explanations?.recruiter?.decision === 'Pending' ? 'Awaiting your review' : (data.explanations?.recruiter?.decision ?? '—')}
                  </p>
                  <p className="text-xs text-muted-foreground">Score: {data.explanations?.recruiter?.score?.toFixed(1) ?? '—'}/100</p>
                </div>
              </div>

              {/* Reason */}
              <div className="p-3 rounded-lg bg-secondary/50 text-sm">
                <p className="font-medium mb-1 flex items-center gap-1"><Lightbulb className="h-4 w-4 text-accent" /> Reason</p>
                <p className="text-muted-foreground italic">
                  {isAnonymized
                    ? (data.explanations?.recruiter?.reason ?? 'No explanation available.')
                    : (data.explanations?.recruiter?.bias_insight ?? data.explanations?.recruiter?.reason ?? 'No explanation available.')}
                </p>
              </div>

              {/* Score Breakdown bars */}
              {data.explanations?.recruiter?.score_breakdown && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Score Breakdown</p>
                  {Object.entries(data.explanations.recruiter.score_breakdown)
                    .filter(([k]) => k !== 'total' && k !== 'institute_bias')
                    .map(([key, val]) => (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-28 capitalize">{key}</span>
                        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full bg-accent transition-all"
                            style={{ width: `${Math.min(100, Number(val) / 30 * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono w-10 text-right">{Number(val).toFixed(1)}</span>
                      </div>
                    ))}
                </div>
              )}

              {/* Missing Skills */}
              {(data.explanations?.recruiter?.missing_skills ?? []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Missing Required Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {(data.explanations.recruiter.missing_skills as string[]).map((s: string) => (
                      <Badge key={s} variant="outline" className="text-destructive border-destructive/30 text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions for seeker */}
              {(data.explanations?.job_seeker?.suggestions ?? []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Improvement Suggestions</p>
                  <ul className="space-y-1">
                    {(data.explanations.job_seeker.suggestions as string[]).map((s: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3 text-accent mt-0.5 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fairness & Bias Report */}
          <Card className="border-accent/30 bg-accent/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-accent" />
                <CardTitle className="text-lg">Fairness & Bias Report</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg border bg-background">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Normal View Score</p>
                  <p className="text-2xl font-bold">{biasData?.normal_view?.score}%</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{biasData?.normal_view?.reason}</p>
                </div>
                <div className="p-3 rounded-lg border border-success/30 bg-success/5">
                  <p className="text-xs text-success uppercase font-semibold">Anonymized (Fair) Score</p>
                  <p className="text-2xl font-bold text-success">{biasData?.anonymized_view?.score}%</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{biasData?.anonymized_view?.reason}</p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 text-sm">
                <p className="font-medium mb-1">Bias Comparison Insight</p>
                <p className="text-muted-foreground italic">
                  {isAnonymized
                    ? (data.explanations?.recruiter?.reason ?? 'No insight available.')
                    : (data.explanations?.recruiter?.bias_insight ?? data.explanations?.recruiter?.reason ?? 'No insight available.')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Code className="h-5 w-5 text-accent" />
                <CardTitle className="text-lg">Extracted Skills</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(extracted?.skills || []).map((skill: string) => (
                  <Badge key={skill} variant="secondary" className="px-3 py-1 text-sm">
                    {skill}
                  </Badge>
                ))}
              </div>
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Skills Match Score</span>
                  <span className="font-bold text-success">{scoring.score_breakdown?.skills_match}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Experience Relevance</span>
                  <span className="font-bold text-primary">{scoring.score_breakdown?.experience}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Experience Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-accent" />
                <CardTitle className="text-lg">Experience Summary</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">{extracted?.experience_years} Years of Experience</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on resume processing, the candidate has {extracted?.experience_years} years of relevant experience across {extracted?.projects_count} major projects.
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30 text-xs text-muted-foreground flex items-center gap-2">
                <EyeOff className="h-3 w-3" />
                Specific company names hidden to prevent organizational bias
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Interview Scheduling */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-accent" />
                <CardTitle className="text-lg">Schedule Interview</CardTitle>
              </div>
              <CardDescription>
                Select a date and time for the interview
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isScheduled ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="h-6 w-6 text-success" />
                  </div>
                  <p className="font-medium">Interview Scheduled!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {interviewDate && format(interviewDate, 'PPP')} at {interviewTime}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsScheduled(false)}
                  >
                    Reschedule
                  </Button>
                </div>
              ) : (
                <>
                  {/* Date Picker */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {interviewDate ? format(interviewDate, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={interviewDate}
                          onSelect={setInterviewDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Time Picker */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Time</label>
                    <Select value={interviewTime} onValueChange={setInterviewTime}>
                      <SelectTrigger>
                        <Clock className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Meeting Link */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Meeting Link (Optional)</label>
                    <div className="relative">
                      <Code className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input
                        type="url"
                        placeholder="Zoom, Google Meet, etc."
                        className="w-full bg-background border border-input rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                        value={meetingLink}
                        onChange={(e) => setMeetingLink(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold"
                    onClick={handleScheduleInterview}
                    disabled={isScheduling || !interviewDate || !interviewTime}
                  >
                    {isScheduling ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Scheduling...
                      </>
                    ) : (
                      "Schedule Interview"
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

  );
};

export default CandidateDetail;
