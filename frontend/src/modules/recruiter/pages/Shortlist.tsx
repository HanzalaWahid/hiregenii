import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useQuery } from '@tanstack/react-query';
import { apiJson } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Eye,
  AlertTriangle,
  CheckSquare,
  Hash,
  GraduationCap,
  TrendingUp,
  UserCheck,
  Info,
  Clock,
  Shield,
} from 'lucide-react';
import type { AnonymizedCandidate } from '@/types';

const Shortlist = () => {
  const [revealingId, setRevealingId] = useState<string | null>(null);

  const { data: fetchedCandidates, refetch } = useQuery({
    queryKey: ['shortlistedCandidates'],
    queryFn: () => apiJson<AnonymizedCandidate[]>('/shortlisted'),
  });

  const [localCandidates, setLocalCandidates] = useState<AnonymizedCandidate[]>([]);

  useEffect(() => {
    if (fetchedCandidates) {
      setLocalCandidates(fetchedCandidates);
    }
  }, [fetchedCandidates]);

  const handleReveal = (candidateId: string) => {
    setLocalCandidates(
      localCandidates.map((c) =>
        c.candidateId === candidateId ? { ...c, isRevealed: true } : c
      )
    );
    setRevealingId(null);
  };

  const candidates = localCandidates;
  const shortlistedCount = candidates.length;
  const revealedCount = candidates.filter((c) => c.isRevealed).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Shortlisted Candidates</h1>
        <p className="text-muted-foreground mt-1">
          Review shortlisted candidates and reveal identities when ready
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-secondary p-3 text-accent">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Shortlisted</p>
              <p className="text-2xl font-semibold">{shortlistedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-secondary p-3 text-success">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Revealed</p>
              <p className="text-2xl font-semibold">{revealedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-secondary p-3 text-primary">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Reveal</p>
              <p className="text-2xl font-semibold">{shortlistedCount - revealedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
        <Info className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-warning">Identity Reveal Process</p>
          <p className="text-sm text-muted-foreground mt-1">
            Once you reveal a candidate's identity, you'll see their full profile including name, 
            contact information, and educational institution. This action is logged for bias 
            monitoring purposes.
          </p>
        </div>
      </div>

      {/* Candidates List */}
      {candidates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium">No shortlisted candidates</p>
            <p className="text-sm text-muted-foreground mt-1">
              Shortlist candidates from the screening page to see them here
            </p>
            <Link to="/recruiter/candidates" className="mt-4 inline-block">
              <Button variant="outline">Go to Screening</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {candidates.map((candidate) => (
            <Card
              key={candidate.candidateId}
              className={candidate.isRevealed ? 'ring-1 ring-success' : ''}
            >
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-secondary-foreground font-mono">
                      <Hash className="h-4 w-4 mr-0.5" />
                      {candidate.candidateId.slice(-3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{candidate.candidateId}</p>
                        {candidate.isRevealed && (
                          <Badge className="bg-revealed text-revealed-foreground">
                            Revealed
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <GraduationCap className="h-4 w-4" />
                          {candidate.educationLevel}
                        </span>
                        <span className="flex items-center gap-1 text-success">
                          <TrendingUp className="h-4 w-4" />
                          {candidate.matchPercentage}% match
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {candidate.revealStatus === 'approved' ? (
                      <Link to={`/recruiter/candidate/${candidate.candidateId}`}>
                        <Button className="bg-success hover:bg-success/90">
                          View Full Profile
                        </Button>
                      </Link>
                    ) : candidate.revealStatus === 'pending' ? (
                      <Button variant="outline" disabled className="border-warning text-warning">
                        <Clock className="h-4 w-4 mr-2" />
                        Reveal Pending
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="border-accent text-accent hover:bg-accent/10"
                        onClick={async () => {
                          try {
                            await apiJson(`/applications/${candidate.id}/request-reveal`, { method: 'POST' });
                            toast.success("Access request sent to candidate!");
                            refetch();
                          } catch (e) {
                            toast.error("Failed to send request");
                          }
                        }}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Request Access
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Shortlist;
