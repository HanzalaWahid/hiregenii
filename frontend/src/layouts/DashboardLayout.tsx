import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { DashboardSidebar } from '@/layouts/DashboardSidebar';
import { DashboardHeader } from '@/layouts/DashboardHeader';
import type { UserRole, Notification } from '@/types';
import { useJobUpdates } from '@/hooks/useJobUpdates';
import { ProgressBar } from '@/components/ProgressBar';
import { useAuth } from '@/modules/auth/AuthContext';
import { apiJson } from '@/services/api';
import { useEffect } from 'react';

interface DashboardLayoutProps {
  role: UserRole;
}

export const DashboardLayout = ({ role }: DashboardLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const data = await apiJson<Notification[]>('/notifications');
        setNotifications(data);
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };
    fetchNotifs();
  }, []);

  // Initialize real-time job updates
  useJobUpdates(role, setNotifications);

  // Redirect users away from the other role's pages. This is UX only (the API enforces access),
  // and it must come after every hook so the hook order never changes between renders.
  if (user && user.role !== role) {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <ProgressBar />
      {/* Sidebar - Hidden on mobile, shown on desktop */}
      <div className="hidden md:block">
        <DashboardSidebar
          role={role}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 transform bg-sidebar transition-transform duration-300 md:hidden',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <DashboardSidebar
          role={role}
          collapsed={false}
          onToggle={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Main Content */}
      <div
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
        )}
      >
        <DashboardHeader
          role={role}
          notifications={notifications}
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
