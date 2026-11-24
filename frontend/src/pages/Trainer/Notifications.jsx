import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  Send,
  MessageSquare,
  Users,
  AlertCircle,
  Inbox,
} from 'lucide-react';
import trainerService from '../../services/trainerService.js';

export default function Notifications({ onNavigate }) {
  const [notifications, setNotifications] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [messageForm, setMessageForm] = useState({
    targetClientId: 'ALL',
    title: '',
    message: '',
  });

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      const [nRes, cRes] = await Promise.all([
        trainerService.getNotifications(),
        trainerService.getMyClients(),
      ]);
      setNotifications(nRes.notifications || []);
      setClients(cRes.clients || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await trainerService.markNotificationRead(id);
      fetchNotifs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await trainerService.markAllNotificationsRead();
      fetchNotifs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await trainerService.sendClientNotification(messageForm);
      setShowSendModal(false);
      setMessageForm({ targetClientId: 'ALL', title: '', message: '' });
      alert('Message transmitted to athlete(s) successfully');
    } catch (err) {
      alert(err.message || 'Failed to dispatch message');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-[#E58A32] uppercase tracking-wider font-bold">
            COMMUNICATION DISPATCH
          </span>
          <h1
            className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            NOTIFICATIONS & CLIENT MESSAGING.
          </h1>
          <p className="text-xs text-[#A3A3A3]">
            Review facility bulletins, workout log updates, and broadcast directives to your athletes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSendModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E58A32] hover:bg-[#F09A43] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(229,138,50,0.25)]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Message Athlete</span>
          </button>
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2.5 rounded-xl bg-[#141414] hover:bg-[#1C1C1C] border border-[#292929] text-xs font-bold uppercase text-[#A3A3A3] hover:text-white transition-colors"
          >
            Mark All Read
          </button>
        </div>
      </div>

      {/* ── INBOX LIST ── */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-[#141414] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#141414] border border-[#292929] text-center flex flex-col items-center justify-center gap-3">
          <Inbox className="w-10 h-10 text-[#292929]" />
          <h3 className="text-sm font-bold uppercase text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            NO NOTIFICATIONS
          </h3>
          <p className="text-xs text-[#A3A3A3] max-w-sm">
            You're all caught up! New client assignments and workout updates will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((notif) => (
            <div
              key={notif._id}
              onClick={() => !notif.isRead && handleMarkRead(notif._id)}
              className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 cursor-pointer ${
                notif.isRead
                  ? 'bg-[#141414] border-[#292929] opacity-75'
                  : 'bg-[#181818] border-[#E58A32]/40 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    notif.isRead ? 'bg-[#202020] text-[#737373]' : 'bg-[#E58A32]/10 text-[#E58A32]'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase">{notif.title}</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-[#202020] text-[#737373]">
                      {notif.category}
                    </span>
                  </div>
                  <p className="text-xs text-[#A3A3A3]">{notif.message}</p>
                  <span className="text-[10px] text-[#737373]">
                    {new Date(notif.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {!notif.isRead && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkRead(notif._id);
                  }}
                  className="text-xs text-[#E58A32] hover:underline font-bold uppercase shrink-0"
                >
                  Mark Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL: SEND MESSAGE ── */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#141414] border border-[#292929] rounded-2xl p-6 flex flex-col gap-4">
            <h3
              className="text-base font-bold uppercase text-white"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              TRANSMIT ATHLETE DIRECTIVE
            </h3>

            <form onSubmit={handleSendMessage} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase text-[#A3A3A3]">RECIPIENT</label>
                <select
                  value={messageForm.targetClientId}
                  onChange={(e) => setMessageForm({ ...messageForm, targetClientId: e.target.value })}
                  className="p-2.5 rounded-xl bg-[#181818] border border-[#292929] text-xs text-white"
                >
                  <option value="ALL">-- Broadcast to All Assigned Athletes ({clients.length}) --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase text-[#A3A3A3]">TITLE</label>
                <input
                  type="text"
                  required
                  value={messageForm.title}
                  onChange={(e) => setMessageForm({ ...messageForm, title: e.target.value })}
                  placeholder="e.g. Schedule Confirmation / Rest Day Reminder"
                  className="p-2.5 rounded-xl bg-[#181818] border border-[#292929] text-xs text-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase text-[#A3A3A3]">MESSAGE CONTENT</label>
                <textarea
                  required
                  rows="4"
                  value={messageForm.message}
                  onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
                  placeholder="Type your coaching directive or announcement..."
                  className="p-2.5 rounded-xl bg-[#181818] border border-[#292929] text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#292929]">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#1C1C1C] text-xs font-bold uppercase text-[#A3A3A3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#E58A32] hover:bg-[#F09A43] text-white text-xs font-bold uppercase"
                >
                  {submitting ? 'Transmitting...' : 'Dispatch Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
