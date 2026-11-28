import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Fingerprint, X, ArrowRight } from 'lucide-react';
import authService from '../services/auth.js';
import attendanceNotificationService from '../services/attendanceNotificationService.js';

const DESKTOP_PREF_KEY = 'mm_desktop_notifications_enabled';

const getSocketBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

const getBrowserPermission = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return window.Notification.permission || 'default';
};

const AttendanceNotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  socketConnected: false,
  permissionState: 'default',
  desktopEnabled: true,
  loading: false,
  requestDesktopPermission: async () => 'default',
  setDesktopEnabled: () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  clearHistory: async () => {},
  refreshNotifications: async () => {},
});

export const useAttendanceNotifications = () => useContext(AttendanceNotificationContext);

export function AttendanceNotificationProvider({ children, selectedBranch = 'ALL', onNavigate }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [permissionState, setPermissionState] = useState(getBrowserPermission);
  const [desktopEnabled, setDesktopEnabledState] = useState(() => {
    try {
      const saved = localStorage.getItem(DESKTOP_PREF_KEY);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [toasts, setToasts] = useState([]);

  const seenAttendanceIdsRef = useRef(new Set());
  const desktopEnabledRef = useRef(desktopEnabled);
  const onNavigateRef = useRef(onNavigate);
  const selectedBranchRef = useRef(selectedBranch);
  const hasConnectedOnceRef = useRef(false);
  const lastEventCursorRef = useRef(null);

  useEffect(() => {
    desktopEnabledRef.current = desktopEnabled;
  }, [desktopEnabled]);

  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);

  useEffect(() => {
    selectedBranchRef.current = selectedBranch;
  }, [selectedBranch]);

  const navigateToSubject = useCallback((item) => {
    const path =
      item?.subjectType === 'CLIENT'
        ? '/admin/attendance'
        : item?.employeeId
          ? `/admin/employees/${item.employeeId}`
          : '/admin/attendance';
    if (onNavigateRef.current) {
      onNavigateRef.current(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await attendanceNotificationService.list({ branchId: selectedBranch, limit: 30 });
      const list = res.notifications || [];
      list.forEach((n) => {
        if (n.attendanceId) seenAttendanceIdsRef.current.add(String(n.attendanceId));
      });
      if (list[0]?.createdAt) {
        lastEventCursorRef.current = list[0].createdAt;
      }
      setNotifications(list);
      setUnreadCount(res.unreadCount || 0);
    } catch {
      // Keep existing state on transient error
    } finally {
      setLoading(false);
    }
  }, [selectedBranch]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  const setDesktopEnabled = useCallback((enabled) => {
    const next = Boolean(enabled);
    setDesktopEnabledState(next);
    try {
      localStorage.setItem(DESKTOP_PREF_KEY, String(next));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const requestDesktopPermission = useCallback(async () => {
    const current = getBrowserPermission();
    setPermissionState(current);
    if (current === 'unsupported') return 'unsupported';
    // Never repeatedly request if user already denied
    if (current === 'denied') return 'denied';
    if (current === 'granted') {
      setDesktopEnabled(true);
      return 'granted';
    }
    try {
      const result = await window.Notification.requestPermission();
      setPermissionState(result);
      if (result === 'granted') {
        setDesktopEnabled(true);
      }
      return result;
    } catch {
      return getBrowserPermission();
    }
  }, [setDesktopEnabled]);

  const showInAppToast = useCallback((item) => {
    const toastId = item.attendanceId || item.id || `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [{ ...item, toastId }, ...prev].slice(0, 4));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
    }, 7000);
  }, []);

  const showDesktopNotification = useCallback(
    (item) => {
      if (!desktopEnabledRef.current) return;
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (window.Notification.permission !== 'granted') return;

      const displayName = item.subjectName || item.employeeName || 'Member';
      const displayCode = item.clientCode || item.employeeCode || '';
      const subjectLabel = item.subjectType === 'CLIENT' ? 'Client' : 'Employee';
      const bodyLines = [
        `${subjectLabel}: ${displayName}${displayCode ? ` (${displayCode})` : ''}`,
        item.branchName ? `Branch: ${item.branchName}` : null,
        `Time: ${item.formattedTime}`,
        `Device: ${item.deviceName || 'eSSL X2008'}`,
        `Event: ${item.eventLabel || (item.eventType === 'CHECK_OUT' ? 'Check-out' : 'Check-in')}`,
      ].filter(Boolean);

      try {
        const notif = new window.Notification(item.title || 'New Attendance Event', {
          body: bodyLines.join('\n'),
          icon: '/logo.jpg',
          tag: `mm-att-${item.attendanceId || item.id}`,
          renotify: false,
        });

        notif.onclick = () => {
          window.focus();
          navigateToSubject(item);
          notif.close();
        };
      } catch {
        // Fallback already handled by in-app toast
      }
    },
    [navigateToSubject]
  );

  const handleIncomingNotification = useCallback(
    (item) => {
      if (!item) return;
      const activeBranch = selectedBranchRef.current;
      if (activeBranch && activeBranch !== 'ALL' && item.branchId && String(item.branchId) !== String(activeBranch)) {
        return;
      }

      const dedupId = String(item.attendanceId || item.id || '');
      if (dedupId && seenAttendanceIdsRef.current.has(dedupId)) {
        return;
      }
      if (dedupId) {
        seenAttendanceIdsRef.current.add(dedupId);
      }
      if (item.createdAt) {
        lastEventCursorRef.current = item.createdAt;
      }

      setNotifications((prev) => [item, ...prev].slice(0, 50));
      setUnreadCount((c) => c + 1);
      showInAppToast(item);
      showDesktopNotification(item);

      window.dispatchEvent(new CustomEvent('mm:attendance-updated', { detail: item }));
    },
    [showInAppToast, showDesktopNotification]
  );

  const recoverMissedEvents = useCallback(async () => {
    try {
      const res = await attendanceNotificationService.list({
        branchId: selectedBranchRef.current,
        limit: 30,
        ...(lastEventCursorRef.current ? { since: lastEventCursorRef.current } : {}),
      });
      const incoming = res.notifications || [];
      if (incoming.length > 0) {
        if (incoming[0]?.createdAt) {
          lastEventCursorRef.current = incoming[0].createdAt;
        }
        const unseen = incoming.filter((n) => {
          const id = String(n.attendanceId || n.id || '');
          if (!id || seenAttendanceIdsRef.current.has(id)) return false;
          seenAttendanceIdsRef.current.add(id);
          return true;
        });
        if (unseen.length > 0) {
          setNotifications((prev) => [...unseen, ...prev].slice(0, 50));
        }
      }
      if (typeof res.unreadCount === 'number') {
        setUnreadCount(res.unreadCount);
      }
      window.dispatchEvent(new CustomEvent('mm:attendance-updated', { detail: { recovered: true } }));
    } catch {
      // Ignore transient recovery failure
    }
  }, []);

  // Establish authenticated Socket.IO connection with automatic reconnect & missed-event recovery
  useEffect(() => {
    const token = authService.getToken();
    const user = authService.getUser();
    if (!token || user?.role !== 'ADMIN') return undefined;

    const socket = io(getSocketBaseUrl(), {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 10000,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setSocketConnected(true);
      if (hasConnectedOnceRef.current) {
        recoverMissedEvents();
      } else {
        hasConnectedOnceRef.current = true;
      }
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('connect_error', () => {
      setSocketConnected(false);
    });

    socket.on('attendance:employee', handleIncomingNotification);
    socket.on('attendance:client', handleIncomingNotification);
    socket.on('attendance:updated', (payload) => {
      const activeBranch = selectedBranchRef.current;
      if (activeBranch && activeBranch !== 'ALL' && payload?.branchId && String(payload.branchId) !== String(activeBranch)) {
        return;
      }
      window.dispatchEvent(new CustomEvent('mm:attendance-updated', { detail: payload }));
    });

    return () => {
      socket.off('attendance:employee', handleIncomingNotification);
      socket.off('attendance:client', handleIncomingNotification);
      socket.off('attendance:updated');
      socket.disconnect();
      setSocketConnected(false);
    };
  }, [handleIncomingNotification, recoverMissedEvents]);

  // Lightweight fallback polling ONLY while socket is disconnected
  useEffect(() => {
    if (socketConnected) return undefined;
    const token = authService.getToken();
    const user = authService.getUser();
    if (!token || user?.role !== 'ADMIN') return undefined;

    const timer = setInterval(() => {
      recoverMissedEvents();
    }, 15000);
    return () => clearInterval(timer);
  }, [socketConnected, recoverMissedEvents]);

  const markAsRead = useCallback(async (id) => {
    setNotifications((prev) => {
      const target = prev.find((n) => n.id === id);
      if (target && !target.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      return prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    });
    try {
      await attendanceNotificationService.markRead(id);
    } catch {
      // ignore
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await attendanceNotificationService.markAllRead();
    } catch {
      // ignore
    }
  }, []);

  const clearHistory = useCallback(async () => {
    setNotifications([]);
    setUnreadCount(0);
    try {
      await attendanceNotificationService.clearHistory();
    } catch {
      // ignore
    }
  }, []);

  return (
    <AttendanceNotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        socketConnected,
        permissionState,
        desktopEnabled,
        loading,
        requestDesktopPermission,
        setDesktopEnabled,
        markAsRead,
        markAllAsRead,
        clearHistory,
        refreshNotifications,
      }}
    >
      {children}

      {/* In-App Toast Notification Stack (fallback & live visual feedback) */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 w-[calc(100vw-2rem)] max-w-sm pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.toastId}
              className="pointer-events-auto bg-[#141414] border border-[#EB3E2E]/50 rounded-2xl p-4 shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-3"
            >
              <div className="w-9 h-9 rounded-xl bg-[#EB3E2E]/15 border border-[#EB3E2E]/40 flex items-center justify-center text-[#EB3E2E] shrink-0">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5]">
                    {toast.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => setToasts((prev) => prev.filter((t) => t.toastId !== toast.toastId))}
                    className="text-[#858585] hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-[#D4D4D4] mt-1">
                  <strong>{toast.subjectName || toast.employeeName}</strong>
                  {(toast.clientCode || toast.employeeCode) && ` (${toast.clientCode || toast.employeeCode})`}
                </p>
                {toast.message && toast.subjectType === 'CLIENT' && (
                  <p className="text-[11px] text-[#B8B8B8] mt-0.5">{toast.message}</p>
                )}
                <p className="text-[11px] text-[#858585] mt-0.5">
                  {toast.branchName ? `${toast.branchName} • ` : ''}
                  {toast.formattedTime} • {toast.deviceName || 'eSSL X2008'}
                </p>
                {(toast.employeeId || toast.clientProfileId) && (
                  <button
                    type="button"
                    onClick={() => {
                      markAsRead(toast.id);
                      navigateToSubject(toast);
                      setToasts((prev) => prev.filter((t) => t.toastId !== toast.toastId));
                    }}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase text-[#EB3E2E] hover:underline cursor-pointer"
                  >
                    <span>View Attendance</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AttendanceNotificationContext.Provider>
  );
}
