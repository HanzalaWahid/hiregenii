import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';

import type { Notification } from '@/types';

import { apiJson, getAuthToken } from '@/services/api';

export const useJobUpdates = (role?: string, setNotifications?: React.Dispatch<React.SetStateAction<Notification[]>>) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    // The backend usually runs on port 8000. Use environment variable or default.
    const token = getAuthToken();
    if (!token) return;

    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
    const wsBaseUrl = BACKEND_URL.replace(/^http/, 'ws');
    const wsUrl = `${wsBaseUrl}/ws/jobs?token=${token}`;

    console.log('Attempting to connect to WebSocket:', wsUrl);

    let socket: WebSocket | null = null;
    let reconnectTimeout: any;

    const connect = () => {
      try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          console.log('✅ Connected to targeted notification WebSocket');
        };

        socket.onmessage = (event) => {
          console.log('📩 WebSocket message received:', event.data);
          try {
            const payload = JSON.parse(event.data);
            if (payload.event === 'new_job') {
              console.log('🔄 New job detected, refetching jobs list...');
              queryClient.invalidateQueries({ queryKey: ['jobs'] });
              
              const jobData = payload.data;
              if (role === 'seeker' && setNotifications) {
                const newNotif: Notification = {
                  id: payload.notif_id || `notif-job-${Date.now()}`,
                  title: 'New Job Posted',
                  message: `A new position for "${jobData.title}" is now available.`,
                  type: 'info',
                  read: false,
                  createdAt: new Date(),
                };
                setNotifications(prev => [newNotif, ...prev]);
                toast.info(`New Job: ${jobData.title}`);
              }
            } else if (payload.event === 'new_application') {
              console.log('📩 New application received!');
              queryClient.invalidateQueries({ queryKey: ['candidates'] });
              queryClient.invalidateQueries({ queryKey: ['myJobs'] });
              
              if (role === 'recruiter' && setNotifications) {
                const appData = payload.data;
                const newNotif: Notification = {
                  id: payload.notif_id || `notif-app-${Date.now()}`,
                  title: 'New Application',
                  message: `Someone applied for "${appData.job_title}".`,
                  type: 'success',
                  read: false,
                  createdAt: new Date(),
                };
                setNotifications(prev => [newNotif, ...prev]);
                toast.success(`New application for ${appData.job_title}`);
              }
            } else if (payload.event === 'notification') {
              console.log('🔔 Generic notification received!');
              if (setNotifications) {
                const notifData = payload.data;
                const newNotif: Notification = {
                  id: payload.notif_id || `notif-gen-${Date.now()}`,
                  title: notifData.title,
                  message: notifData.message,
                  type: notifData.type || 'info',
                  read: false,
                  createdAt: new Date(),
                  extra_data: notifData.extra_data
                };
                setNotifications(prev => [newNotif, ...prev]);
                
                // Invalidate relevant queries to update UI state (reveal buttons, detail views)
                queryClient.invalidateQueries({ queryKey: ['cv'] });
                queryClient.invalidateQueries({ queryKey: ['candidates'] });
                queryClient.invalidateQueries({ queryKey: ['shortlistedCandidates'] });
                queryClient.invalidateQueries({ queryKey: ['applications'] });

                toast(notifData.message, { type: (notifData.type === 'reveal_request' ? 'info' : notifData.type) as any || 'info' });
              }
            }
          } catch (err) {
            // Backward compatibility or simple messages
            if (event.data === 'new_job') {
              queryClient.invalidateQueries({ queryKey: ['jobs'] });
            }
          }
        };

        socket.onclose = (event) => {
          console.log(`❌ WebSocket disconnected (code: ${event.code}), retrying in 3s...`);
          reconnectTimeout = setTimeout(connect, 3000);
        };

        socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          socket?.close();
        };
      } catch (err) {
        console.error('Failed to initiate WebSocket connection:', err);
        reconnectTimeout = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      if (socket) {
        socket.onclose = null; // Prevent reconnection on cleanup
        socket.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, [queryClient, navigate]);
};
