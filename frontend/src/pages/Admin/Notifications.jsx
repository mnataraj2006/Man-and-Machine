import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Send,
  Building,
  CheckCircle2,
  Clock,
  Users,
  Bell,
  AlertCircle,
} from 'lucide-react';
import adminService from '../../services/adminService.js';
import { useAdmin } from '../../components/Admin/AdminLayout.jsx';

export default function Notifications() {
  const { branches } = useAdmin();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Broadcast Modal
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    branchId: 'ALL',
  });

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getAnnouncements();
      setAnnouncements(res.announcements || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleBroadcastSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await adminService.createAnnouncement(formData);
      setSuccess(res.message || 'Announcement broadcast successfully!');
      setIsBroadcastOpen(false);
      setFormData({ title: '', message: '', branchId: 'ALL' });
      fetchAnnouncements();
    } catch (err) {
      setError(err.message || 'Failed to broadcast announcement');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2
            className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#F5F5F5]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            NOTIFICATIONS &amp; BROADCAST ANNOUNCEMENTS
          </h2>
          <p className="text-xs text-[#A3A3A3]">
            Broadcast official gym announcements, schedule revisions, and holiday notices directly to client dashboards.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsBroadcastOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E58A32] hover:bg-[#F09A43] text-black transition-all cursor-pointer shadow-lg shadow-[#E58A32]/10"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          <Send className="w-4 h-4" />
          <span>New Broadcast</span>
        </button>
      </div>

      {/* Global Notice */}
      {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{error}</div>}
      {success && <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs">{success}</div>}

      {/* ── BROADCAST HISTORY LIST ── */}
      <div className="bg-[#181818] border border-[#292929] rounded-2xl p-5">
        <h3
          className="text-sm font-bold uppercase tracking-wider text-[#F5F5F5] mb-4 flex items-center gap-2"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          <Megaphone className="w-4 h-4 text-[#E58A32]" />
          <span>Sent Announcements Log</span>
        </h3>

        {loading ? (
          <div className="py-12 text-center text-xs text-[#A3A3A3]">Loading announcement history...</div>
        ) : announcements.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#A3A3A3]">
            No announcements have been broadcast yet. Click "New Broadcast" to dispatch notices to athletes.
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="p-4 rounded-xl bg-[#121212] border border-[#292929] flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E58A32]/10 border border-[#E58A32]/20 flex items-center justify-center text-[#E58A32] shrink-0 mt-0.5">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#F5F5F5]">{ann.title}</h4>
                    <p className="text-xs text-[#A3A3A3] mt-0.5 leading-relaxed">{ann.message}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-mono text-[#A3A3A3] shrink-0 md:self-center">
                  <Clock className="w-3.5 h-3.5 text-[#E58A32]" />
                  <span>
                    {new Date(ann.createdAt).toLocaleDateString()} at{' '}
                    {new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── BROADCAST ANNOUNCEMENT MODAL ── */}
      {isBroadcastOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#292929] rounded-2xl w-full max-w-md p-6 relative">
            <h3
              className="text-lg font-bold uppercase tracking-tight text-[#F5F5F5] mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Broadcast Official Announcement
            </h3>

            <form onSubmit={handleBroadcastSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Target Branch Audience</label>
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none"
                >
                  <option value="ALL">All Branches (Kovilpatti, Karur, Sivakasi)</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.city} Branch Only
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Announcement Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none"
                  placeholder="e.g. Special Holiday Hours / Steam Bath Maintenance"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Notice Message</label>
                <textarea
                  rows={4}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#E58A32] focus:outline-none"
                  placeholder="Enter notice details. This will appear instantly on athlete dashboards and notification center..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBroadcastOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#222222] text-[#A3A3A3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E58A32] hover:bg-[#F09A43] text-black cursor-pointer disabled:opacity-50"
                >
                  {sending ? 'Broadcasting...' : 'Broadcast to Athletes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
