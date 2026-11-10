import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  Plus,
  X,
  Briefcase,
  Sliders,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Loader2
} from 'lucide-react';

import type { SkillRequirement } from '@/types';
import { apiJson } from '@/services/api';

type FormErrors = {
  title?: string;
  description?: string;
  experienceLevel?: string;
  skills?: string;
};

const PostJob = () => {
  const navigate = useNavigate();
  const [profileLoading, setProfileLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const user = await apiJson<any>('/auth/me');
        setHasProfile(!!user.recruiter_profile);
      } catch (err) {
        setHasProfile(false);
      } finally {
        setProfileLoading(false);
      }
    };
    checkProfile();
  }, []);

  const [formData, setFormData] = useState({
  title: '',
  description: '',
  experienceLevel: '',
});

const [skills, setSkills] = useState<SkillRequirement[]>([]);
const [newSkill, setNewSkill] = useState('');

const [errors, setErrors] = useState<FormErrors>({});

const [submitError, setSubmitError] = useState<string | null>(null);

const [isLoading, setIsLoading] = useState(false);

const [isSubmitted, setIsSubmitted] = useState(false);

  const addSkill = () => {
    const normalized = newSkill.trim().toLowerCase();

    if (
      normalized &&
      !skills.find(
        (s) => s.skill.trim().toLowerCase() === normalized
      )
    ) {
      setSkills([
        ...skills,
        {
          skill: newSkill.trim(),
          weight: 50,
        },
      ]);

      setNewSkill('');
    }
  };

  const removeSkill = (skillName: string) => {
    setSkills(skills.filter((s) => s.skill !== skillName));
  };

  const updateSkillWeight = (
    skillName: string,
    weight: number
  ) => {
    setSkills(
      skills.map((s) =>
        s.skill === skillName
          ? { ...s, weight }
          : s
      )
    );
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Job title is required';
    } else if (formData.title.trim().length < 2) {
      newErrors.title = 'Title must be at least 2 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Job description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters long';
    }

    if (!formData.experienceLevel) {
      newErrors.experienceLevel =
        'Experience level is required';
    }

    if (skills.length === 0) {
      newErrors.skills =
        'At least one skill is required';
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitError(null);
    setIsLoading(true);

    try {
      await apiJson('/jobs', {
  method: 'POST',

    body: JSON.stringify({
      title: formData.title,
      description: formData.description,
      experience_level: formData.experienceLevel,
      required_skills: skills,
    }),
});

      setIsSubmitted(true);

      setTimeout(() => {
        navigate('/recruiter/dashboard');
      }, 2000);

    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.detail ||
          err?.message ||
          'Failed to post job'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasProfile) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pt-12">
        <Card className="border-warning/50 bg-warning/5 border-dashed">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-warning" />
            </div>
            <CardTitle className="text-2xl">Profile Completion Required</CardTitle>
            <CardDescription className="text-base">
              You must complete your company profile before you can post your first job.
              This helps candidates learn about your organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pb-8">
            <div className="bg-background/50 p-4 rounded-lg border border-border w-full space-y-2">
              <p className="text-sm font-medium">Missing information includes:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Company Name</li>
                <li>Headquarters Location</li>
                <li>Business Description</li>
              </ul>
            </div>
            <Link to="/recruiter/profile" className="w-full">
              <Button className="w-full gap-2" size="lg">
                Complete Profile Now
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="ghost" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="flex items-center justify-center min-h-[400px] animate-fade-in">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>

            <h2 className="text-xl font-semibold mb-2">
              Job Posted Successfully!
            </h2>

            <p className="text-muted-foreground">
              Your job posting is now live and
              candidates can start applying.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Post a New Job
        </h1>

        <p className="text-muted-foreground mt-1">
          Create a job posting and define
          skill requirements
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* Job Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-accent" />

              <CardTitle className="text-lg">
                Job Details
              </CardTitle>
            </div>

            <CardDescription>
              Basic information about the
              position
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Job Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Job Title
              </Label>

              <Input
                id="title"
                placeholder="e.g., Machine Learning Engineer"
                value={formData.title}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    title: e.target.value,
                  })
                }
                className={
                  errors.title
                    ? 'border-destructive'
                    : ''
                }
              />

              {errors.title && (
                <p className="text-sm text-destructive">
                  {errors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Job Description
              </Label>

              <Textarea
                id="description"
                placeholder="Describe the role, responsibilities, and requirements..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
                rows={5}
                className={
                  errors.description
                    ? 'border-destructive'
                    : ''
                }
              />

              {errors.description && (
                <p className="text-sm text-destructive">
                  {errors.description}
                </p>
              )}
            </div>

            {/* Experience Level */}
            <div className="space-y-2">
              <Label>
                Experience Level
              </Label>

              <Select
                value={formData.experienceLevel}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    experienceLevel: value,
                  })
                }
              >
                <SelectTrigger
                  className={
                    errors.experienceLevel
                      ? 'border-destructive'
                      : ''
                  }
                >
                  <SelectValue placeholder="Select experience level" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="entry">
                    Entry Level (0-2 years)
                  </SelectItem>

                  <SelectItem value="mid">
                    Mid Level (2-5 years)
                  </SelectItem>

                  <SelectItem value="senior">
                    Senior Level (5+ years)
                  </SelectItem>
                </SelectContent>
              </Select>

              {errors.experienceLevel && (
                <p className="text-sm text-destructive">
                  {errors.experienceLevel}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-accent" />

              <CardTitle className="text-lg">
                Required Skills
              </CardTitle>
            </div>

            <CardDescription>
              Add skills and adjust their
              importance
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Add Skill */}
            <div className="flex gap-2">
              <Input
                placeholder="Add a skill"
                value={newSkill}
                onChange={(e) =>
                  setNewSkill(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                className="flex-1"
              />

              <Button
                type="button"
                onClick={addSkill}
                size="icon"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {errors.skills && (
              <p className="text-sm text-destructive">
                {errors.skills}
              </p>
            )}

            {/* Skills List */}
            {skills.length > 0 ? (
              <div className="space-y-4 pt-2">
                {skills.map((skill) => (
                  <div
                    key={skill.skill}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="secondary"
                        className="text-sm"
                      >
                        {skill.skill}
                      </Badge>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Weight:{' '}
                          {skill.weight}%
                        </span>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            removeSkill(
                              skill.skill
                            )
                          }
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <Slider
                      value={[skill.weight]}
                      onValueChange={(value) =>
                        updateSkillWeight(
                          skill.skill,
                          value[0]
                        )
                      }
                      min={10}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Sliders className="h-10 w-10 mx-auto mb-2 opacity-50" />

                <p className="text-sm">
                  No skills added yet
                </p>

                <p className="text-xs">
                  Add skills above to define
                  job requirements
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error */}
        {submitError && (
          <p className="text-sm text-destructive">
            {submitError}
          </p>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            disabled={isLoading}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            size="lg"
            disabled={isLoading}
          >
            {isLoading
              ? 'Posting...'
              : 'Post Job'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PostJob;