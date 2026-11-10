import { Link } from "react-router-dom";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type AnalysisEmptyStateProps = {
  title?: string;
  message: string;
};

export const AnalysisEmptyState = ({ title = "No Resume Analyzed Yet", message }: AnalysisEmptyStateProps) => (
  <Card>
    <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
      <UploadCloud className="h-12 w-12 text-accent" aria-hidden="true" />
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      <Button asChild className="mt-2">
        <Link to="/seeker/resume-analysis">Upload a resume</Link>
      </Button>
    </CardContent>
  </Card>
);
