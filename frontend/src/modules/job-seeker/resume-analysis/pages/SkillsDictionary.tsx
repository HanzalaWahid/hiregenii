import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Database, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { addSkillMapping, deleteSkillMapping, getSkillMappings } from "../api";
import { useResumeAnalysis } from "../ResumeAnalysisContext";
import type { SkillCategory, SkillMapping } from "../types";

const errorMessage = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

const SkillsDictionary = () => {
  const { analysisData } = useResumeAnalysis();
  const [mappings, setMappings] = useState<SkillMapping[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [raw, setRaw] = useState("");
  const [normalized, setNormalized] = useState("");
  const [category, setCategory] = useState<SkillCategory>("frontend");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const response = await getSkillMappings();
        setMappings(response.mappings ?? []);
        setError("");
      } catch (err) {
        setError(errorMessage(err, "Failed to load skill mappings"));
        setMappings([]);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!successMsg) return;
    const timer = window.setTimeout(() => setSuccessMsg(""), 3000);
    return () => window.clearTimeout(timer);
  }, [successMsg]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!raw.trim() || !normalized.trim()) return;
    if (mappings.some((m) => m.raw.toLowerCase() === raw.trim().toLowerCase())) {
      setError("This raw alias mapping already exists!");
      return;
    }
    try {
      setIsSubmitting(true);
      await addSkillMapping(raw.trim(), normalized.trim(), category);
      setMappings([{ raw: raw.trim(), normalized: normalized.trim(), category }, ...mappings]);
      setRaw("");
      setNormalized("");
      setSuccessMsg("New skill mapping registered successfully!");
      setError("");
    } catch (err) {
      setError(errorMessage(err, "Failed to add skill mapping"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (rawTerm: string) => {
    try {
      await deleteSkillMapping(rawTerm);
      setMappings(mappings.filter((m) => m.raw !== rawTerm));
      setSuccessMsg(`Removed "${rawTerm}" mapping`);
    } catch (err) {
      setError(errorMessage(err, "Failed to delete mapping"));
    }
  };

  const query = search.toLowerCase();
  const filteredMappings = mappings.filter(
    (item) => item.raw.toLowerCase().includes(query) || item.normalized.toLowerCase().includes(query)
  );
  const normalizedSkillMap = analysisData?.normalized_skill_map ?? [];

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Skills Normalization Dictionary</h1>
        <p className="text-muted-foreground mt-1">
          Manage dictionary aliases that resolve legacy and colloquial technical abbreviations to standard taxonomy values.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6 min-w-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Resume Skill Normalization</CardTitle>
            </CardHeader>
            <CardContent>
              {normalizedSkillMap.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Original Skill</TableHead>
                        <TableHead><span className="sr-only">maps to</span></TableHead>
                        <TableHead>Normalized Skill</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Confidence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {normalizedSkillMap.map((item, idx) => (
                        <TableRow key={`${item.original}-${idx}`}>
                          <TableCell className="font-mono text-xs">{item.original}</TableCell>
                          <TableCell><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" /></TableCell>
                          <TableCell className="font-medium">{item.normalized}</TableCell>
                          <TableCell><Badge variant="secondary">{item.category.replace(/_/g, " ")}</Badge></TableCell>
                          <TableCell className="text-right tabular-nums">{Math.round((item.confidence || 0) * 100)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
                  <AlertCircle className="h-6 w-6" aria-hidden="true" />
                  <p className="text-sm">Upload a resume to view live skill normalization results.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <CardTitle className="text-lg">Vocabulary Mappings</CardTitle>
              <div className="relative sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  type="search"
                  placeholder="Search raw or normalized terms..."
                  aria-label="Search skill mappings"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Loading mappings…</p>
              ) : filteredMappings.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Raw Extracted Term</TableHead>
                        <TableHead><span className="sr-only">maps to</span></TableHead>
                        <TableHead>Normalized Output</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMappings.map((item) => (
                        <TableRow key={item.raw}>
                          <TableCell className="font-mono text-xs">{item.raw}</TableCell>
                          <TableCell><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" /></TableCell>
                          <TableCell className="font-medium">{item.normalized}</TableCell>
                          <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => void handleDelete(item.raw)}
                              aria-label={`Delete ${item.raw} mapping`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
                  <Database className="h-8 w-8" aria-hidden="true" />
                  <p className="text-sm">No matching alias records found in the database.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Add Dictionary Alias</CardTitle>
            <CardDescription>
              Add a mapping rule so that whenever the extractor encounters a custom raw string, it will group it under the unified standard name.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {successMsg && (
              <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 p-3 text-sm text-success" role="status">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {successMsg}
              </div>
            )}
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="raw-term">Raw Extracted Text</Label>
                <Input id="raw-term" placeholder="e.g., ReactJS, AWS S3, TS" value={raw} onChange={(e) => setRaw(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="normalized-term">Normalized Canonical Name</Label>
                <Input
                  id="normalized-term"
                  placeholder="e.g., React, AWS, TypeScript"
                  value={normalized}
                  onChange={(e) => setNormalized(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skill-category">Category</Label>
                <Select value={category} onValueChange={(value) => setCategory(value as SkillCategory)}>
                  <SelectTrigger id="skill-category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frontend">Frontend &amp; Design</SelectItem>
                    <SelectItem value="backend">Backend &amp; System</SelectItem>
                    <SelectItem value="devops">Cloud &amp; DevOps</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
                Register Alias Rule <Plus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SkillsDictionary;
