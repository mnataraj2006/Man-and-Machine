import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Filter,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Tag,
} from 'lucide-react';
import clientService from '../../services/clientService.js';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'ALL', label: 'All Updates' },
    { id: 'MEMBERSHIP', label: 'Membership' },
    { id: 'WORKOUT', label: 'Workouts' },
    { id: 'TRAINER', label: 'Trainer' },
    { id: 'ATTENDANCE', label: 'Attendance' },
    { id: 'PAYMENTS', label: 'Payments' },
    { id: 'ANNOUNCEMENT', label: 'Announcements' },
  ];

  const fetchNotifs = async (cat = selectedCategory) => {
    try {
      setLoading(true);
      const res = await clientService.getNotifications(cat);
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs(selectedCategory);
  }, [selectedCategory]);

  const handleMarkRead = async (id) => {
    try {
      await clientService.markNotificationAsRead(id);
      fetchNotifs(selectedCategory);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await clientService.markAllNotificationsRead();
      fetchNotifs(selectedCategory);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-mono text-[#E58A32] uppercase tracking-wider font-bold">
            COMMUNICATION DISPATCH
          </span>
          <h1
            className="uppercase font-bold tracking-tight text-[#F5F5F5]"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(1.75rem, 3.2vw, 2.5rem)',
            }}
          >
            IN-APP NOTIFICATIONS.
          </h1>
          <p className="text-xs sm:text-sm text-[#A3A3A3]">
            Official facility announcements, workout plan alerts, and membership reminders.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#151515] hover:bg-[#1C1C1C] border border-[#292929] hover:border-[#E58A32] text-xs font-bold uppercase tracking-wider text-[#F5F5F5] transition-colors cursor-pointer"
          >
            <CheckCheck className="w-4 h-4 text-[#E58A32]" />
            <span>MARK ALL AS READ</span>
          </button>
        )}
      </div>

      {/* ── CATEGORY PILLS ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-[#E58A32] text-white shadow-[0_0_15px_rgba(229,138,50,0.25)]'
                : 'bg-[#151515] border border-[#292929] text-[#A3A3A3] hover:text-[#F5F5F5]'
            }`}
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── NOTIFICATIONS LIST ── */}
      <div className="p-6 rounded-2xl bg-[#151515] border border-[#292929] flex flex-col gap-3">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#A3A3A3]">Loading notifications...</div>
        ) : notifications.length > 0 ? (
          <div className="flex flex-col divide-y divide-[#292929]">
            {notifications.map((n) => (
              <div
                key={n._id}
                className={`py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                  !n.isRead ? 'bg-[#1C1C1C]/40 -mx-3 px-3 rounded-xl' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                      !n.isRead ? 'bg-[#E58A32]' : 'bg-[#292929]'
                    }`}
                  />
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#F5F5F5] uppercase text-xs sm:text-sm">
                        {n.title}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-[#141414] border border-[#292929] text-[#E58A32]">
                        {n.category}
                      </span>
                    </div>
                    <p className="text-xs text-[#A3A3A3] leading-relaxed mt-0.5">{n.message}</p>
                    <span className="text-[10px] font-mono text-[#A3A3A3]/70 mt-1">
                      {new Date(n.createdAt).toLocaleDateString()} at{' '}
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {!n.isRead && (
                  <button
                    type="button"
                    onClick={() => handleMarkRead(n._id)}
                    className="self-end sm:self-center px-3 py-1 rounded-lg bg-[#141414] hover:bg-[#E58A32] text-[#A3A3A3] hover:text-white border border-[#292929] text-[10px] font-bold uppercase tracking-wider transition-colors shrink-0 cursor-pointer"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
            <Bell className="w-10 h-10 text-[#292929]" />
            <h3 className="text-sm font-bold uppercase text-[#F5F5F5]">NO NOTIFICATIONS FOUND</h3>
            <p className="text-xs text-[#A3A3A3] max-w-sm">
              You are up to date! Future workout assignments, renewal notices, and branch alerts will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
