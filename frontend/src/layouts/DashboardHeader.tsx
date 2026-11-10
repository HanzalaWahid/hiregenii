import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Menu } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { UserRole, Notification } from '@/types';
import { useAuth } from '@/modules/auth/AuthContext';
import { apiJson } from '@/services/api';

interface HeaderProps {
  role: UserRole;
  notifications: Notification[];
  onMenuClick?: () => void;
}

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';

export const DashboardHeader = ({ role, notifications, onMenuClick }: HeaderProps) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Stored notifications carry the numeric DB id; ones pushed over the socket may not.
  const handleAction = async (appId: number, approved: boolean, notificationId: Notification['id'] | number) => {
    try {
      await apiJson(`/applications/${appId}/respond-reveal`, {
        method: 'POST',
        body: JSON.stringify({ approved })
      });
      
      // Only call read API if we have a real numeric ID (from DB)
      if (typeof notificationId === 'number') {
        await apiJson(`/notifications/${notificationId}/read`, { method: 'PATCH' });
      }
      
      // Invalidate both notifications and candidates/applications
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['shortlistedCandidates'] });
      
      if (approved) {
        toast.success("Profile access approved!");
      } else {
        toast.info("Profile access rejected");
      }
    } catch (err) {
      toast.error("Action failed");
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      {/* Left: Mobile Menu & Search */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 pl-9 bg-secondary/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Right: Role Badge & Notifications */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <ModeToggle />

        {/* Role Badge */}
        <Badge
          variant="secondary"
          className="hidden sm:inline-flex capitalize"
        >
          {role === 'seeker' ? 'Job Seeker' : 'Recruiter'}
        </Badge>

        {/* Notifications */}
        <DropdownMenu onOpenChange={async (open) => {
          if (open && unreadCount > 0) {
            try {
              await apiJson('/notifications/read-all', { method: 'PATCH' });
              queryClient.invalidateQueries({ queryKey: ['notifications'] });
            } catch (err) {
              console.error("Failed to mark notifications as read", err);
            }
          }
        }}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-accent-foreground">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} new
                </Badge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No new notifications
              </div>
            ) : (
              notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className="flex flex-col items-start gap-2 p-3 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-2 w-full">
                    {!notification.read && (
                      <span className="h-2 w-2 rounded-full bg-accent flex-shrink-0" />
                    )}
                    <span className="font-medium text-sm truncate">{notification.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground pl-4">
                    {notification.message}
                  </span>
                  
                  {notification.type === 'reveal_request' && !notification.read && (
                    <div className="flex gap-2 mt-2 pl-4 w-full">
                      <Button 
                        size="sm" 
                        className="h-7 text-[10px] flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!notification.extra_data?.app_id) return;
                          handleAction(notification.extra_data.app_id, true, notification.id);
                        }}
                      >
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 text-[10px] flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!notification.extra_data?.app_id) return;
                          handleAction(notification.extra_data.app_id, false, notification.id);
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-primary cursor-pointer">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium"
              aria-label="User menu"
            >
              {user?.full_name?.slice(0, 1)?.toUpperCase() || (role === 'seeker' ? 'J' : 'R')}
              {(role === 'seeker' ? 'S' : 'C')}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="space-y-0.5">
              <div className="text-sm font-medium">{user?.full_name || 'Account'}</div>
              <div className="text-xs text-muted-foreground">{user?.email || ''}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="cursor-pointer"
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
