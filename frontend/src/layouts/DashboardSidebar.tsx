import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/utils/cn';
import {
  Home,
  User,
  FileText,
  Eye,
  Briefcase,
  PlusCircle,
  Users,
  CheckSquare,
  LogOut,
  Shield,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ScanSearch,
  Gauge,
  FileSearch,
  Target,
  BookA,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { UserRole } from '@/types';
import { useAuth } from '@/modules/auth/AuthContext';

interface SidebarProps {
  role: UserRole;
  collapsed: boolean;
  onToggle: () => void;
}

const seekerNavItems = [
  { path: '/seeker/dashboard', label: 'Dashboard', icon: Home },
  { path: '/seeker/profile', label: 'Profile', icon: User },
  { path: '/seeker/cv-upload', label: 'CV Upload', icon: FileText },
  { path: '/seeker/generalized-cv', label: 'Generalized CV', icon: Eye },
  { path: '/seeker/jobs', label: 'Job Listings', icon: Briefcase },
  { path: '/seeker/interviews', label: 'Interviews', icon: Calendar },
  { path: '/seeker/resume-analysis', label: 'Resume Analyzer', icon: ScanSearch },
  { path: '/seeker/resume-analysis/report', label: 'ATS Report', icon: Gauge },
  { path: '/seeker/resume-analysis/explorer', label: 'Resume Explorer', icon: FileSearch },
  { path: '/seeker/resume-analysis/job-match', label: 'Job Matcher', icon: Target },
  { path: '/seeker/resume-analysis/skills', label: 'Skills Dictionary', icon: BookA },
];

const recruiterNavItems = [
  { path: '/recruiter/dashboard', label: 'Dashboard', icon: Home },
  { path: '/recruiter/profile', label: 'Company Profile', icon: User },
  { path: '/recruiter/post-job', label: 'Post Job', icon: PlusCircle },
  { path: '/recruiter/candidates', label: 'Candidates', icon: Users },
  { path: '/recruiter/shortlist', label: 'Shortlist', icon: CheckSquare },
  { path: '/recruiter/interviews', label: 'Interviews', icon: Calendar },
];

export const DashboardSidebar = ({ role, collapsed, onToggle }: SidebarProps) => {
  const location = useLocation();
  const { logout } = useAuth();
  const navItems = role === 'seeker' ? seekerNavItems : recruiterNavItems;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
                <Shield className="h-4 w-4 text-sidebar-primary-foreground" />
              </div>
              <span className="font-semibold text-sm text-sidebar-foreground">Hire Ginni</span>
            </div>
          )}
          {collapsed && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary mx-auto">
              <Shield className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            const linkContent = (
              <Link
                to={item.path}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.path} delayDuration={0}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.path}>{linkContent}</div>;
          })}
        </nav>

        {/* Role Indicator */}
        {!collapsed && (
          <div className="mx-3 mb-2 rounded-lg bg-sidebar-accent/30 px-3 py-2 border border-sidebar-border/50">
            <p className="text-[10px] uppercase tracking-wider font-bold text-sidebar-foreground/40">Role</p>
            <p className="text-sm font-medium capitalize text-sidebar-foreground/90">{role}</p>
          </div>
        )}

        {/* Logout */}
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={logout}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive',
              collapsed && 'justify-center'
            )}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm hover:bg-sidebar-accent"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </div>
    </aside>
  );
};
