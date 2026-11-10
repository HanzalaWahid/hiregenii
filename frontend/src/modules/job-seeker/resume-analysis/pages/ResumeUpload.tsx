import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  File as FileIcon,
  Loader2,
  Settings2,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/utils/cn";
import { useResumeAnalysis } from "../ResumeAnalysisContext";
import type { AnalysisResponse, ExtractionProvider } from "../types";

const PIPELINE_STAGES = [
  { id: 1, name: "File Validation", desc: "Checking format, size, and security" },
  { id: 2, name: "Text Extraction", desc: "Running PDF/DOCX structure parsing" },
  { id: 3, name: "Section Detection", desc: "Detecting contact, work, and skills layout" },
  { id: 4, name: "Entity Extraction", desc: "Parsing names, organizations, and periods" },
  { id: 5, name: "Skill Extraction", desc: "Mapping raw skills from vocabulary" },
  { id: 6, name: "Data Normalization", desc: "Generating structured Resume Object" },
];

const PROVIDERS: { value: ExtractionProvider; label: string; description: string }[] = [
  { value: "auto", label: "Auto (Local)", description: "Uses the local rule-based extractor; no AI provider fallback" },
  { value: "custom_rule", label: "Custom Rule-based Extractor", description: "Fast offline extraction — no API key needed" },
  { value: "gemini", label: "Gemini LLM Extractor", description: "Google Gemini AI — requires GEMINI_API_KEY" },
  { value: "cerebras", label: "Cerebras Qwen Extractor", description: "Cerebras inference — requires CEREBRAS_API_KEY" },
];

const CLIENT_MAX_BYTES = 10 * 1024 * 1024;

type UploadStatus = "idle" | "parsing" | "success" | "error";

const ResumeUpload = () => {
  const navigate = useNavigate();
  const { runAnalysis } = useResumeAnalysis();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [provider, setProvider] = useState<ExtractionProvider>("auto");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (stageTimerRef.current) window.clearInterval(stageTimerRef.current);
  }, []);

  const stopStageTimer = () => {
    if (stageTimerRef.current) window.clearInterval(stageTimerRef.current);
    stageTimerRef.current = null;
  };

  const validateClientSide = (selected: File) => {
    const ext = selected.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx") {
      setStatus("error");
      setErrorMessage("Unsupported file format! Please upload a PDF or DOCX file.");
      return false;
    }
    if (selected.size > CLIENT_MAX_BYTES) {
      setStatus("error");
      setErrorMessage("File size exceeds the 10MB safety limit.");
      return false;
    }
    return true;
  };

  const processFile = async (selected: File) => {
    if (!validateClientSide(selected)) return;

    setFile(selected);
    setStatus("parsing");
    setErrorMessage("");
    setCurrentStage(1);
    setProgress(10);

    // Animate the pipeline stages while the real API call runs
    let stage = 1;
    stageTimerRef.current = window.setInterval(() => {
      stage += 1;
      if (stage <= PIPELINE_STAGES.length) {
        setCurrentStage(stage);
        setProgress((stage / PIPELINE_STAGES.length) * 85); // Cap at 85% until done
      }
    }, 800);

    try {
      const result = await runAnalysis(selected, provider);
      stopStageTimer();
      setProgress(100);
      setCurrentStage(PIPELINE_STAGES.length + 1);
      setAnalysisResult(result);
      setStatus("success");
    } catch (err) {
      stopStageTimer();
      setStatus("error");
      setErrorMessage(err instanceof Error && err.message ? err.message : "Analysis failed. The backend may not be reachable.");
    }
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) void processFile(dropped);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) void processFile(selected);
    e.target.value = "";
  };

  const resetUploader = () => {
    setFile(null);
    setStatus("idle");
    setCurrentStage(0);
    setProgress(0);
    setErrorMessage("");
    setAnalysisResult(null);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Upload Resume</h1>
        <p className="text-muted-foreground mt-1">
          Securely upload your resume for immediate structure extraction and ATS matching analysis.
        </p>
      </div>

      {status === "idle" && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4" aria-hidden="true" /> Extraction Provider
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={provider}
                onValueChange={(value) => setProvider(value as ExtractionProvider)}
                className="grid gap-3 sm:grid-cols-2"
              >
                {PROVIDERS.map((p) => (
                  <Label
                    key={p.value}
                    htmlFor={`provider-${p.value}`}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal",
                      provider === p.value ? "border-accent bg-accent/5" : "border-border"
                    )}
                  >
                    <RadioGroupItem id={`provider-${p.value}`} value={p.value} className="mt-0.5" />
                    <span>
                      <span className="block text-sm font-medium text-foreground">{p.label}</span>
                      <span className="block text-xs text-muted-foreground">{p.description}</span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          <div
            role="button"
            tabIndex={0}
            aria-label="Upload a resume file"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              dragActive ? "border-accent bg-accent/5" : "border-border hover:border-accent/60"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={handleChange}
              id="resume-file-input"
            />
            <UploadCloud className="h-12 w-12 text-accent" aria-hidden="true" />
            <h3 className="text-base font-semibold text-foreground">Drag and drop your file here</h3>
            <p className="text-sm text-muted-foreground">Supports PDF or DOCX (Max 10MB)</p>
            <Button type="button" tabIndex={-1}>Browse Files</Button>
          </div>
        </>
      )}

      {status === "error" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertCircle className="h-11 w-11 text-destructive" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-foreground">Validation Failed</h3>
            <p className="max-w-md text-sm text-muted-foreground" role="alert">{errorMessage}</p>
            <Button onClick={resetUploader}>Try Another File</Button>
          </CardContent>
        </Card>
      )}

      {status === "parsing" && (
        <Card>
          <CardContent className="space-y-6 pt-6">
            <div className="flex items-center gap-3">
              <FileIcon className="h-7 w-7 text-accent" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-foreground">{file?.name}</p>
                <p className="text-xs text-muted-foreground">{((file?.size ?? 0) / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <Loader2 className="h-6 w-6 animate-spin text-accent" aria-hidden="true" />
            </div>

            <div className="space-y-2" aria-live="polite">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Processing Pipeline...</span>
                <span className="font-medium tabular-nums">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>

            <ol className="space-y-3">
              {PIPELINE_STAGES.map((stage) => {
                const isActive = currentStage === stage.id;
                const isCompleted = currentStage > stage.id;
                return (
                  <li key={stage.id} className={cn("flex items-start gap-3", !isActive && !isCompleted && "opacity-60")}>
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs">
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                      ) : isActive ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        stage.id
                      )}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-foreground">{stage.name}</span>
                      <span className="block text-xs text-muted-foreground">{stage.desc}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}

      {status === "success" && analysisResult && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-foreground">Analysis Complete!</h2>
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{file?.name}</strong> has been processed successfully.
              {analysisResult.personal_info?.name && (
                <> Detected candidate: <strong className="text-foreground">{analysisResult.personal_info.name}</strong>.</>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Extraction path: <strong>{analysisResult.provider_used || "auto"}</strong>
              {analysisResult.fallback_used ? " · fallback used" : ""}
              {typeof analysisResult.confidence_score === "number"
                ? ` · Confidence ${Math.round(analysisResult.confidence_score * 100)}%`
                : ""}
            </p>

            <div className="grid w-full max-w-md grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-lg border p-3 text-left">
                <ShieldCheck className="h-5 w-5 text-accent" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium">ATS Score</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{analysisResult.ats_score?.overall ?? 0} / 100</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3 text-left">
                <Cpu className="h-5 w-5 text-accent" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium">{analysisResult.skills?.length ?? 0} Skills</p>
                  <p className="text-xs text-muted-foreground">Extracted &amp; Normalized</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={resetUploader}>Upload Different Resume</Button>
              <Button onClick={() => navigate("/seeker/resume-analysis/report")} className="gap-2">
                View ATS Dashboard <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ResumeUpload;
