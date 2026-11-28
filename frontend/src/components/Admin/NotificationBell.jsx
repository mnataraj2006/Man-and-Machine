import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, Clock, Building2, Fingerprint, Wifi, WifiOff } from 'lucide-react';
import { useAttendanceNotifications } from '../../context/AttendanceNotificationContext.jsx';

export default function NotificationBell({ onNavigate }) {
  const {
    notifications,
    unreadCount,
    socketConnected,
    permissionState,
    markAsRead,
    markAllAsRead,
    clearHistory,
  } = useAttendanceNotifications();

  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleOpenDetails = (item) => {
    if (!item.isRead) {
      markAsRead(item.id);
    }
    setOpen(false);
    const target = `/admin/employees/${item.employeeId}`;
    if (onNavigate) {
      onNavigate(target);
    } else {
      window.history.pushState({}, '', target);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Attendance Notifications"
        className="relative min-w-[40px] h-10 px-2.5 rounded-xl bg-[#181818] hover:bg-[#202020] border border-[#303030] hover:border-[#EB3E2E]/50 flex items-center justify-center text-[#F5F5F5] transition-colors cursor-pointer"
      >
        <Bell className="w-4 h-4" />
        {/* Live Socket Indicator Dot */}
        <span
          title={socketConnected ? 'Live attendance stream connected' : 'Reconnecting...'}
          className={`absolute bottom-1.5 left-1.5 w-2 h-2 rounded-full ${
            socketConnected ? 'bg-emerald-400' : 'bg-amber-400'
          }`}
        />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#EB3E2E] text-white text-[10px] font-bold flex items-center justify-center shadow">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 bg-[#141414] border border-[#303030] rounded-2xl shadow-2xl overflow-hidden z-50">
          <div className="px-4 py-3 bg-[#181818] border-b border-[#2A2A2A] flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5]">
                  Attendance Alerts
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                    socketConnected
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-amber-500/15 text-amber-400'
                  }`}
                >
                  {socketConnected ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                  {socketConnected ? 'Live' : 'Offline'}
                </span>
              </div>
              <p className="text-[10px] text-[#858585] mt-0.5">
                Desktop alerts: <strong className="text-[#D4D4D4] uppercase">{permissionState}</strong>
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  className="p-1.5 rounded-lg bg-[#202020] hover:bg-[#2A2A2A] text-[#D4D4D4] hover:text-white cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearHistory}
                  title="Clear notification history"
                  className="p-1.5 rounded-lg bg-[#202020] hover:bg-red-500/20 text-[#D4D4D4] hover:text-red-300 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-[#222222]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Fingerprint className="w-8 h-8 text-[#404040] mx-auto" />
                <div className="text-xs font-semibold text-[#B8B8B8]">No recent attendance alerts</div>
                <p className="text-[11px] text-[#858585]">
                  Employee check-ins and check-outs from eSSL X2008 will appear here in real time.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleOpenDetails(item)}
                  className={`w-full text-left px-4 py-3 hover:bg-[#1C1C1C] transition-colors flex items-start gap-3 cursor-pointer ${
                    !item.isRead ? 'bg-[#EB3E2E]/[0.06]' : ''
                  }`}
                >
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      !item.isRead ? 'bg-[#EB3E2E]' : 'bg-transparent'
                    }`}
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          item.eventType === 'CHECK_OUT'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {item.eventLabel || (item.eventType === 'CHECK_OUT' ? 'Check-out' : 'Check-in')}
                      </span>
                      <span className="text-[10px] font-mono text-[#858585] flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        {item.formattedTime}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-[#F5F5F5] truncate">
                      {item.employeeName}{' '}
                      <span className="font-mono text-[#EB3E2E] font-normal">({item.employeeCode})</span>
                    </div>
                    <div className="text-[11px] text-[#858585] flex items-center gap-2 truncate">
                      {item.branchName && (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {item.branchName}
                        </span>
                      )}
                      <span>• {item.deviceName || 'eSSL X2008'}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
