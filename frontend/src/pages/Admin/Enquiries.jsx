import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  UserCheck,
  Building,
  Edit,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import adminService from '../../services/adminService.js';
import { useAdmin } from '../../components/Admin/AdminLayout.jsx';

export default function Enquiries() {
  const { branches, selectedBranch } = useAdmin();
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [branchFilter, setBranchFilter] = useState(selectedBranch);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEnquiry, setEditingEnquiry] = useState(null);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    branchId: '',
    fitnessGoal: 'Muscle Building',
    source: 'WALK_IN',
    notes: '',
    status: 'NEW',
  });

  useEffect(() => {
    setBranchFilter(selectedBranch);
  }, [selectedBranch]);

  const fetchEnquiries = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getEnquiries({
        branchId: branchFilter,
        status: statusFilter,
        search,
      });
      setEnquiries(res.enquiries || []);
    } catch (err) {
      setError(err.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, [branchFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEnquiries();
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminService.createEnquiry(form);
      setIsAddModalOpen(false);
      fetchEnquiries();
      alert('Lead registered successfully!');
    } catch (err) {
      alert(err.message || 'Failed to create lead');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminService.updateEnquiry(editingEnquiry._id, form);
      setEditingEnquiry(null);
      fetchEnquiries();
      alert('Lead status updated!');
    } catch (err) {
      alert(err.message || 'Failed to update lead');
    }
  };

  const handleConvertLead = async (enquiry) => {
    if (!window.confirm(`Convert ${enquiry.name} directly into a registered Client Account?`)) return;
    try {
      const res = await adminService.convertEnquiryToClient(enquiry._id);
      alert(res.message || 'Lead converted successfully to client!');
      fetchEnquiries();
    } catch (err) {
      alert(err.message || 'Conversion failed');
    }
  };

  // Quick stats
  const totalLeads = enquiries.length;
  const convertedLeads = enquiries.filter((e) => e.status === 'CONVERTED').length;
  const newLeads = enquiries.filter((e) => e.status === 'NEW').length;
  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2
            className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#F5F5F5]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            ENQUIRIES &amp; PROSPECTIVE ATHLETES
          </h2>
          <p className="text-xs text-[#A3A3A3]">
            Track walkthroughs, phone enquiries, follow-up timelines, and 1-click member onboarding.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setForm({
              name: '',
              phone: '',
              email: '',
              branchId: branches[0]?._id || '',
              fitnessGoal: 'Muscle Building',
              source: 'WALK_IN',
              notes: '',
              status: 'NEW',
            });
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E58A32] hover:bg-[#F09A43] text-black transition-all cursor-pointer shadow-lg shadow-[#E58A32]/10"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          <Plus className="w-4 h-4" />
          <span>Add Enquiry</span>
        </button>
      </div>

      {/* ── KPI METRICS STRIP ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#181818] border border-[#292929] rounded-2xl p-4">
          <span className="text-[10px] font-mono uppercase text-[#A3A3A3]">TOTAL LEADS</span>
          <p className="text-2xl font-bold text-[#F5F5F5] mt-1">{totalLeads}</p>
        </div>
        <div className="bg-[#181818] border border-[#292929] rounded-2xl p-4">
          <span className="text-[10px] font-mono uppercase text-[#A3A3A3]">NEW UNCONTACTED</span>
          <p className="text-2xl font-bold text-cyan-400 mt-1">{newLeads}</p>
        </div>
        <div className="bg-[#181818] border border-[#292929] rounded-2xl p-4">
          <span className="text-[10px] font-mono uppercase text-[#A3A3A3]">CONVERTED MEMBERS</span>
          <p className="text-2xl font-bold text-green-400 mt-1">{convertedLeads}</p>
        </div>
        <div className="bg-[#181818] border border-[#292929] rounded-2xl p-4">
          <span className="text-[10px] font-mono uppercase text-[#A3A3A3]">CONVERSION RATE</span>
          <p className="text-2xl font-bold text-[#E58A32] mt-1">{conversionRate}%</p>
        </div>
      </div>

      {/* ── SEARCH & FILTERS ── */}
      <div className="bg-[#141414] border border-[#292929] rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-[#A3A3A3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by name, phone, or email..."
            className="w-full pl-9 pr-4 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] focus:outline-none"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-3 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Hubs</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.city} Branch
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[#121212] border border-[#292929] rounded-xl text-xs text-[#F5F5F5] focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Pipeline Stages</option>
            <option value="NEW">NEW</option>
            <option value="CONTACTED">CONTACTED</option>
            <option value="VISIT_SCHEDULED">VISIT_SCHEDULED</option>
            <option value="CONVERTED">CONVERTED</option>
            <option value="LOST">LOST</option>
          </select>
        </div>
      </div>

      {/* ── LEADS TABLE ── */}
      <div className="bg-[#181818] border border-[#292929] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#292929] bg-[#141414] text-[10px] font-mono uppercase tracking-wider text-[#A3A3A3]">
                <th className="py-3 px-4 font-semibold">Prospect</th>
                <th className="py-3 px-4 font-semibold">Phone</th>
                <th className="py-3 px-4 font-semibold">Hub</th>
                <th className="py-3 px-4 font-semibold">Goal &amp; Source</th>
                <th className="py-3 px-4 font-semibold">Notes</th>
                <th className="py-3 px-4 font-semibold">Stage</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#A3A3A3]">
                    Loading prospective leads...
                  </td>
                </tr>
              ) : enquiries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#A3A3A3]">
                    No enquiries match the specified criteria.
                  </td>
                </tr>
              ) : (
                enquiries.map((enq) => (
                  <tr key={enq._id} className="hover:bg-[#1E1E1E] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#F5F5F5]">{enq.name}</td>
                    <td className="py-3 px-4 font-mono text-[#F5F5F5]">{enq.phone}</td>
                    <td className="py-3 px-4 font-mono text-[#E58A32]">{enq.branchId?.city || 'HQ'}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#F5F5F5] block">{enq.fitnessGoal}</span>
                      <span className="text-[10px] text-[#A3A3A3] font-mono">{enq.source}</span>
                    </td>
                    <td className="py-3 px-4 text-[#A3A3A3] max-w-[180px] truncate">{enq.notes || 'No notes'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          enq.status === 'CONVERTED'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                            : enq.status === 'NEW'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                            : enq.status === 'LOST'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {enq.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {enq.status !== 'CONVERTED' && (
                          <button
                            type="button"
                            onClick={() => handleConvertLead(enq)}
                            className="px-2.5 py-1 rounded bg-[#E58A32] hover:bg-[#F09A43] text-black font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            Convert
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEnquiry(enq);
                            setForm({
                              name: enq.name,
                              phone: enq.phone,
                              email: enq.email || '',
                              branchId: enq.branchId?._id || '',
                              fitnessGoal: enq.fitnessGoal,
                              source: enq.source,
                              notes: enq.notes || '',
                              status: enq.status,
                            });
                          }}
                          className="p-1 rounded bg-[#222222] hover:bg-[#2F2F2F] text-[#A3A3A3] hover:text-white"
                          title="Edit Stage"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ADD / EDIT LEAD MODAL ── */}
      {(isAddModalOpen || editingEnquiry) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#292929] rounded-2xl w-full max-w-md p-6 relative">
            <h3
              className="text-lg font-bold uppercase tracking-tight text-[#F5F5F5] mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {editingEnquiry ? 'Update Lead Details' : 'Register Prospective Lead'}
            </h3>

            <form onSubmit={editingEnquiry ? handleEditSubmit : handleAddSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Prospect Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5]"
                  placeholder="e.g. Ramesh Kumar"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5]"
                    placeholder="9876543210"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Hub Branch</label>
                  <select
                    value={form.branchId}
                    onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
                  >
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Fitness Goal</label>
                  <select
                    value={form.fitnessGoal}
                    onChange={(e) => setForm({ ...form, fitnessGoal: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
                  >
                    <option value="Muscle Building">Muscle Building</option>
                    <option value="Weight Loss">Weight Loss</option>
                    <option value="Strength Training">Strength Training</option>
                    <option value="General Fitness">General Fitness</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Source</label>
                  <select
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
                  >
                    <option value="WALK_IN">Walk-in Inquiry</option>
                    <option value="WEBSITE">Website Portal</option>
                    <option value="INSTAGRAM">Instagram</option>
                    <option value="FRIEND_REFERRAL">Friend Referral</option>
                  </select>
                </div>
              </div>

              {editingEnquiry && (
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Pipeline Stage</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
                  >
                    <option value="NEW">NEW</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="VISIT_SCHEDULED">VISIT_SCHEDULED</option>
                    <option value="CONVERTED">CONVERTED</option>
                    <option value="LOST">LOST</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#A3A3A3] mb-1">Follow-up Notes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-[#121212] border border-[#292929] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5]"
                  placeholder="Inquired about quarterly membership and steam bath timings..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingEnquiry(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#222222] text-[#A3A3A3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#E58A32] text-black"
                >
                  {editingEnquiry ? 'Save Updates' : 'Add Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
