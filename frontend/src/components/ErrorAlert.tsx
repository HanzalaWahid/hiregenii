import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorAlertProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorAlert({ title = "Error", message, onRetry, className }: ErrorAlertProps) {
  return (
    <Alert variant="destructive" className={className}>
      <div className="flex items-start gap-3">
        <AlertCircle className="h-4 w-4 mt-1" />
        <div className="flex-1">
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription className="mt-1">
            {message}
          </AlertDescription>
          {onRetry && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry} 
              className="mt-3 border-destructive/50 hover:bg-destructive/10 text-destructive-foreground"
            >
              Try Again
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
}
