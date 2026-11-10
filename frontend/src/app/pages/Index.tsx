import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Shield,
  Eye,
  EyeOff,
  Users,
  CheckCircle,
  ArrowRight,
  User,
  Briefcase,
  Scale,
  TrendingUp,
} from 'lucide-react';

const Index = () => {
  const features = [
    {
      icon: EyeOff,
      title: 'Anonymized Profiles',
      description:
        'Names, photos, and institutional affiliations are hidden during initial screening to eliminate unconscious bias.',
    },
    {
      icon: Scale,
      title: 'Skills-Based Matching',
      description:
        'Candidates are evaluated purely on their skills, experience, and qualifications—not on demographic factors.',
    },
    {
      icon: Eye,
      title: 'Controlled Reveal',
      description:
        'Recruiter access to candidate identities is logged and monitored to ensure fair hiring practices.',
    },
    {
      icon: TrendingUp,
      title: 'Transparent Scoring',
      description:
        'Clear skill matching percentages help recruiters make objective, data-driven decisions.',
    },
  ];

  const steps = [
    {
      step: 1,
      title: 'Upload Your CV',
      description: 'Candidates upload their resume, which is automatically parsed and anonymized.',
    },
    {
      step: 2,
      title: 'Skills Extraction',
      description: 'The system extracts skills, experience, and qualifications while removing identifying information.',
    },
    {
      step: 3,
      title: 'Anonymized Screening',
      description: 'Recruiters review candidates based purely on their professional qualifications.',
    },
    {
      step: 4,
      title: 'Merit-Based Selection',
      description: 'Only shortlisted candidates have their identities revealed for final interviews.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">Hire Ginni</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent mb-6">
            <Shield className="h-4 w-4" />
            Fair Recruitment Platform
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight max-w-4xl mx-auto">
            AI Powered Recruitment Platform by{' '}
            <span className="text-accent">Explainable AI</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mt-6 max-w-2xl mx-auto">
            Promote diversity and fairness in hiring by evaluating candidates on their skills
            and qualifications—not their names, photos, or backgrounds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link to="/register">
              <Button size="lg" className="gap-2">
                <User className="h-4 w-4" />
                I'm a Job Seeker
              </Button>
            </Link>
            <Link to="/register">
              <Button size="lg" variant="outline" className="gap-2">
                <Briefcase className="h-4 w-4" />
                I'm a Recruiter
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">How It Works</h2>
            <p className="text-muted-foreground mt-2">
              Our platform ensures fair evaluation at every step
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title} className="bg-card hover:shadow-academic-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="rounded-lg bg-accent/10 w-12 h-12 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">The Anonymization Process</h2>
            <p className="text-muted-foreground mt-2">
              From upload to interview—fairness at every step
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {steps.map((item) => (
              <div key={item.step} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                {item.step < 4 && (
                  <div className="hidden lg:block absolute top-6 left-[60%] w-[80%] border-t-2 border-dashed border-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-3 text-center">
            <div>
              <p className="text-4xl md:text-5xl font-bold">40%</p>
              <p className="text-primary-foreground/70 mt-2">Reduction in hiring bias</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-bold">2.5x</p>
              <p className="text-primary-foreground/70 mt-2">More diverse candidate pools</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-bold">93%</p>
              <p className="text-primary-foreground/70 mt-2">Recruiter satisfaction rate</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="max-w-3xl mx-auto">
            <CardContent className="p-8 md:p-12 text-center">
              <Users className="h-12 w-12 mx-auto text-accent mb-4" />
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Start Hiring Fairly Today
              </h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                Join organizations committed to fair and unbiased recruitment.
                Create an account to get started.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/register">
                  <Button size="lg" className="gap-2">
                    Create Account
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline">
                    Sign In
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex bg-primary/5 rounded-xl p-1">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <span className="font-semibold">Hire Ginni</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Final Year Project: AI Powered Recruitment Platform by Explainable AI
            </p>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} All rights reserved
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
