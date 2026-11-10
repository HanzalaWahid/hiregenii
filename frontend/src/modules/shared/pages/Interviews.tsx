import { useQuery } from '@tanstack/react-query';
import { apiJson } from '@/services/api';
import { useAuth } from '@/modules/auth/AuthContext';
import { Calendar, Clock, Video, User, Briefcase, ExternalLink, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Interviews() {
  const { user } = useAuth();
  const isRecruiter = user?.role === 'recruiter';

  const { data: interviews, isLoading } = useQuery({
    queryKey: ['interviews', user?.role],
    queryFn: () => apiJson<any[]>(isRecruiter ? '/interviews/recruiter' : '/interviews/my'),
  });

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const upcomingInterviews = interviews?.filter(i => new Date(i.scheduled_at) > new Date()) || [];
  const pastInterviews = interviews?.filter(i => new Date(i.scheduled_at) <= new Date()) || [];

  const renderInterviewCard = (interview: any) => (
    <Card key={interview.id} className="group overflow-hidden transition-all hover:shadow-md border-sidebar-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row items-stretch">
          <div className="flex flex-col items-center justify-center p-6 bg-muted/30 sm:w-32 border-b sm:border-b-0 sm:border-r border-sidebar-border/30">
            <span className="text-sm font-bold uppercase text-muted-foreground">{format(new Date(interview.scheduled_at), 'MMM')}</span>
            <span className="text-3xl font-black text-foreground">{format(new Date(interview.scheduled_at), 'dd')}</span>
            <span className="text-xs font-medium text-muted-foreground">{format(new Date(interview.scheduled_at), 'yyyy')}</span>
          </div>
          
          <div className="flex-1 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary/70" />
                  {interview.job_title}
                </h3>
                <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  {isRecruiter ? (
                    <><User className="h-3.5 w-3.5" /> Candidate: <span className="font-semibold text-foreground">{interview.company_name}</span></>
                  ) : (
                    <><User className="h-3.5 w-3.5" /> Company: <span className="font-semibold text-foreground">{interview.company_name}</span></>
                  )}
                </p>
              </div>
              <Badge variant={new Date(interview.scheduled_at) > new Date() ? "default" : "secondary"} className="rounded-full px-3">
                {new Date(interview.scheduled_at) > new Date() ? 'Upcoming' : 'Completed'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground bg-background/50 p-2.5 rounded-lg border border-sidebar-border/20">
                <Clock className="h-4 w-4 text-primary" />
                <span>{format(new Date(interview.scheduled_at), 'hh:mm a')} (Local Time)</span>
              </div>
              
              {interview.meeting_link && (
                <Button variant="outline" size="sm" className="w-full justify-between group/btn" asChild>
                  <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer">
                    <span className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-primary" />
                      Join Meeting
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-50 group-hover/btn:translate-x-0.5 transition-transform" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight text-foreground">Interview Schedule</h1>
        <p className="text-muted-foreground">Manage and track your recruitment sessions all in one place.</p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-sidebar-border/50">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight">Upcoming Sessions</h2>
          <Badge variant="outline" className="ml-auto font-mono">{upcomingInterviews.length}</Badge>
        </div>
        
        {upcomingInterviews.length > 0 ? (
          <div className="grid gap-4">
            {upcomingInterviews.map(renderInterviewCard)}
          </div>
        ) : (
          <Card className="border-dashed bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No upcoming interviews</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
                {isRecruiter 
                  ? "You haven't scheduled any sessions yet. Go to candidate details to book an interview." 
                  : "You don't have any sessions scheduled. Keep applying to get noticed!"}
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {pastInterviews.length > 0 && (
        <section className="space-y-4 opacity-70 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-3 pb-2 border-b border-sidebar-border/50">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-bold tracking-tight text-muted-foreground">Past Sessions</h2>
            <Badge variant="outline" className="ml-auto font-mono">{pastInterviews.length}</Badge>
          </div>
          <div className="grid gap-4">
            {pastInterviews.map(renderInterviewCard)}
          </div>
        </section>
      )}
    </div>
  );
}
