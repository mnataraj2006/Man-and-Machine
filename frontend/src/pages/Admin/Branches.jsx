import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  MapPin,
  Phone,
  Mail,
  Clock,
  Users,
  Dumbbell,
  CreditCard,
  TrendingUp,
  CalendarCheck,
  Edit,
  Power,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import adminService from '../../services/adminService.js';
import { useAdmin } from '../../components/Admin/AdminLayout.jsx';

export default function Branches() {
  const { branches, refreshBranches } = useAdmin();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [selectedBranchDetail, setSelectedBranchDetail] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    city: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    openingHours: 'Mon-Sat: 5:30 AM - 9:30 PM | Sun: 5:30 AM - 10:00 AM',
    facilities: ['Fully Air-Conditioned Gym', 'Steam Bath', 'Clean Atmosphere', 'Bike Parking'],
  });

  const handleOpenAdd = () => {
    setFormData({
      name: 'Man & Machine Fitness',
      city: '',
      code: '',
      address: '',
      phone: '',
      email: '',
      openingHours: 'Mon-Sat: 5:30 AM - 9:30 PM | Sun: 5:30 AM - 10:00 AM',
      facilities: ['Fully Air-Conditioned Gym', 'Steam Bath', 'Clean Atmosphere', 'Bike Parking'],
    });
    setError(null);
    setSuccess(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (b) => {
    setEditingBranch(b);
    setFormData({
      name: b.name,
      city: b.city,
      code: b.code || '',
      address: b.address || '',
      phone: b.phone || '',
      email: b.email || '',
      openingHours: b.openingHours || '',
      facilities: b.facilities || ['Fully Air-Conditioned Gym', 'Steam Bath', 'Clean Atmosphere', 'Bike Parking'],
    });
    setError(null);
    setSuccess(null);
  };

  const handleSaveBranch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (editingBranch) {
        await adminService.updateBranch(editingBranch._id, formData);
        setSuccess(`Branch ${formData.city} updated successfully`);
        setEditingBranch(null);
      } else {
        await adminService.createBranch(formData);
        setSuccess(`New branch ${formData.city} created successfully`);
        setIsAddModalOpen(false);
      }
      refreshBranches();
    } catch (err) {
      setError(err.message || 'Failed to save branch');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (branch) => {
    if (
      !window.confirm(
        `Are you sure you want to ${branch.isActive ? 'deactivate' : 'activate'} the ${branch.city} branch? Historical client records will remain preserved.`
      )
    ) {
      return;
    }
    try {
      await adminService.toggleBranchStatus(branch._id);
      refreshBranches();
    } catch (err) {
      alert(err.message || 'Failed to change branch status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2
            className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#F5F5F5]"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            BRANCH SPECIFICATIONS &amp; HUBS
          </h2>
          <p className="text-xs text-[#B8B8B8]">
            One Brand. Three Locations. Operational oversight for Kovilpatti, Karur &amp; Sivakasi.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#EB3E2E] hover:bg-[#FF493B] text-white transition-all cursor-pointer shadow-lg shadow-[#EB3E2E]/10"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Branch</span>
        </button>
      </div>

      {/* Global alert feedback */}
      {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{error}</div>}
      {success && <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs">{success}</div>}

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((b) => (
          <div
            key={b._id}
            className={`bg-[#181818] border ${
              b.isActive ? 'border-[#303030] hover:border-[#EB3E2E]/50' : 'border-red-500/30 opacity-75'
            } rounded-2xl p-5 flex flex-col justify-between transition-all`}
          >
            <div>
              {/* Branch Header Badge */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#252525] text-[#EB3E2E] font-bold">
                      {b.code || b.city.slice(0, 3).toUpperCase()}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        b.isActive
                          ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                          : 'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {b.isActive ? 'ACTIVE HUB' : 'DEACTIVATED'}
                    </span>
                  </div>
                  <h3
                    className="text-lg font-bold uppercase text-[#F5F5F5] mt-1"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    {b.city}
                  </h3>
                  <span className="text-xs text-[#B8B8B8]">{b.name}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(b)}
                    className="p-1.5 rounded-lg bg-[#202020] hover:bg-[#303030] text-[#B8B8B8] hover:text-white transition-colors cursor-pointer"
                    title="Edit Branch"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(b)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      b.isActive
                        ? 'bg-[#202020] hover:bg-red-500/20 text-[#B8B8B8] hover:text-red-400'
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    }`}
                    title={b.isActive ? 'Deactivate Branch' : 'Activate Branch'}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Branch Stats Grid */}
              <div className="grid grid-cols-2 gap-2 my-4 bg-[#111111] p-3 rounded-xl border border-[#202020]">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-[#B8B8B8] uppercase">ATHLETES</span>
                  <span className="text-base font-bold text-[#F5F5F5]">{b.stats?.clientCount ?? 0}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-[#B8B8B8] uppercase">ACTIVE PASSES</span>
                  <span className="text-base font-bold text-green-400">{b.stats?.activeMemberships ?? 0}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-[#B8B8B8] uppercase">COACHES</span>
                  <span className="text-base font-bold text-[#F5F5F5]">{b.stats?.trainerCount ?? 0}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-[#B8B8B8] uppercase">REVENUE</span>
                  <span className="text-base font-bold text-[#EB3E2E]">
                    ₹{(b.stats?.totalRevenue ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Contact & Hours */}
              <div className="space-y-2 text-xs text-[#B8B8B8]">
                {b.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#EB3E2E] shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{b.address}</span>
                  </div>
                )}
                {b.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#EB3E2E] shrink-0" />
                    <span>{b.phone}</span>
                  </div>
                )}
                {b.openingHours && (
                  <div className="flex items-start gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#EB3E2E] shrink-0 mt-0.5" />
                    <span>{b.openingHours}</span>
                  </div>
                )}
              </div>

              {/* Confirmed Amenities */}
              <div className="mt-4 pt-3 border-t border-[#303030]">
                <span className="text-[10px] font-mono uppercase text-[#B8B8B8] block mb-1.5">
                  FACILITIES &amp; AMENITIES:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(b.facilities && b.facilities.length > 0
                    ? b.facilities
                    : ['Fully Air-Conditioned Gym', 'Steam Bath', 'Clean Atmosphere', 'Bike Parking']
                  ).map((f, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-[#202020] text-[#F5F5F5] text-[10px] font-medium border border-[#303030]"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Safety policy note */}
            <div className="mt-4 pt-3 border-t border-[#202020] flex items-center justify-between text-[10px] text-[#B8B8B8]">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#EB3E2E]" />
                Protected Hub (Preserved DB records)
              </span>
              <span className="font-mono">ID: {b._id.slice(-6)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Branch Modal */}
      {(isAddModalOpen || editingBranch) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#303030] rounded-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
            <h3
              className="text-lg font-bold uppercase tracking-tight text-[#F5F5F5] mb-4"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              {editingBranch ? `Edit ${editingBranch.city} Branch` : 'Register New Gym Hub'}
            </h3>

            {error && <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">{error}</div>}

            <form onSubmit={handleSaveBranch} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Branch City</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                    placeholder="e.g. Madurai"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Hub Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                    placeholder="e.g. MDU-04"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Full Facility Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                  placeholder="e.g. Man & Machine Fitness Gym"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Address</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                  placeholder="Complete street address..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                    placeholder="+91 98421 00000"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                    placeholder="branch@manandmachine.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Operating Hours</label>
                <input
                  type="text"
                  value={formData.openingHours}
                  onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
                  className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#EB3E2E] focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#111111] border border-[#202020] text-[11px] text-[#B8B8B8] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#EB3E2E] shrink-0" />
                <span>
                  Safety Rule: Branches with associated client or payment history cannot be permanently deleted. Use
                  status deactivation to preserve financial audits.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingBranch(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#202020] hover:bg-[#303030] text-[#B8B8B8] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#EB3E2E] hover:bg-[#FF493B] text-white cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingBranch ? 'Update Hub' : 'Register Hub'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
