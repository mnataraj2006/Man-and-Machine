import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, Edit3, Ban, X, History } from 'lucide-react';
import financeService from '../../../services/financeService.js';
import { useAdmin } from '../../../components/Admin/AdminLayout.jsx';
import { useTheme } from '../../../context/ThemeContext.jsx';
import { getChartTheme } from '../../../utils/chartTheme.js';
import { formatINR, formatISTDate, formatISTDateTime, ExportButtons, EmptyFinanceState } from '../../../components/Finance/FinanceShared.jsx';

export default function Expenses() {
  const { branches, selectedBranch } = useAdmin();
  const { resolvedTheme } = useTheme();
  const chartTheme = getChartTheme(resolvedTheme);

  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [config, setConfig] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState(selectedBranch || 'ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [viewExpense, setViewExpense] = useState(null);
  const [formState, setFormState] = useState({
    expenseDate: new Date().toISOString().slice(0, 10),
    branchId: '',
    category: 'Electricity',
    description: '',
    amount: '',
    paymentMethod: 'CASH',
    vendor: '',
    referenceNumber: '',
    notes: '',
    attachmentUrl: '',
    editReason: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setBranchFilter(selectedBranch || 'ALL');
  }, [selectedBranch]);

  useEffect(() => {
    financeService.getConfig().then((r) => setConfig(r.config)).catch(() => {});
  }, []);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const res = await financeService.getExpenses({
        page,
        limit: 20,
        search,
        branchId: branchFilter,
        category: categoryFilter,
        status: statusFilter,
        startDate,
        endDate,
      });
      setExpenses(res.expenses || []);
      setSummary(res.summary);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [page, branchFilter, categoryFilter, statusFilter, startDate, endDate]);

  const activeCategories = (config?.expenseCategories || []).filter((c) => c.isActive !== false);
  const activeMethods = (config?.paymentMethods || []).filter((m) => m.isActive !== false);

  const openCreateModal = () => {
    setEditingExpense(null);
    setFormState({
      expenseDate: new Date().toISOString().slice(0, 10),
      branchId: branchFilter !== 'ALL' ? branchFilter : branches[0]?._id || '',
      category: activeCategories[0]?.name || 'Electricity',
      description: '',
      amount: '',
      paymentMethod: activeMethods[0]?.code || 'CASH',
      vendor: '',
      referenceNumber: '',
      notes: '',
      attachmentUrl: '',
      editReason: '',
    });
    setFormModalOpen(true);
  };

  const openEditModal = (exp) => {
    setEditingExpense(exp);
    setFormState({
      expenseDate: exp.expenseDate ? new Date(exp.expenseDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      branchId: exp.branchId?._id || exp.branchId || '',
      category: exp.category,
      description: exp.description,
      amount: exp.amount,
      paymentMethod: exp.paymentMethod,
      vendor: exp.vendor || '',
      referenceNumber: exp.referenceNumber || '',
      notes: exp.notes || '',
      attachmentUrl: exp.attachmentUrl || '',
      editReason: 'Updated expense details',
    });
    setFormModalOpen(true);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingExpense) {
        await financeService.updateExpense(editingExpense._id, formState);
      } else {
        await financeService.createExpense(formState);
      }
      setFormModalOpen(false);
      loadExpenses();
    } catch (err) {
      alert(err.message || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelExpense = async (exp) => {
    const reason = window.prompt(`Cancel expense ${exp.expenseNumber || exp.description}? Provide audit reason:`, 'Entered in error');
    if (reason === null) return;
    try {
      await financeService.cancelExpense(exp._id, reason);
      loadExpenses();
    } catch (err) {
      alert(err.message || 'Failed to cancel expense');
    }
  };

  const maxCatAmt = Math.max(...(summary?.byCategory || []).map((c) => c.amount || 0), 1);
  const maxBranchAmt = Math.max(...(summary?.byBranch || []).map((b) => b.amount || 0), 1);
  const maxMonthAmt = Math.max(...(summary?.monthlyChart || []).map((m) => m.amount || 0), 1);

  const exportRows = expenses.map((e) => ({
    ExpenseNo: e.expenseNumber || '',
    DateIST: formatISTDate(e.expenseDate),
    Branch: e.branchId?.city || '',
    Category: e.category,
    Description: e.description,
    Vendor: e.vendor || '',
    Amount: e.amount,
    PaymentMethod: e.paymentMethod,
    Status: e.status,
    CreatedBy: e.createdBy?.name || '',
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
            EXPENSES &amp; OUTGOING LEDGER
          </h2>
          <p className="text-xs text-[#B8B8B8]">
            Track facility overheads, vendor payouts, and branch expenses with audit logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons
            onCSV={() => financeService.exportToCSV(exportRows, `expenses_${Date.now()}.csv`)}
            onExcel={() => financeService.exportToExcel(exportRows, `expenses_${Date.now()}.xls`, 'Expenses')}
          />
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Expense Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5">
          <span className="text-[11px] font-mono uppercase text-[#B8B8B8]">Today&apos;s Expenses</span>
          <p className="text-2xl font-bold text-[#F5F5F5] mt-1" style={{ fontFamily: "'Oswald', sans-serif" }}>
            {formatINR(summary?.todayExpenses)}
          </p>
        </div>
        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5">
          <span className="text-[11px] font-mono uppercase text-[#B8B8B8]">This Month</span>
          <p className="text-2xl font-bold text-[#EB3E2E] mt-1" style={{ fontFamily: "'Oswald', sans-serif" }}>
            {formatINR(summary?.monthExpenses)}
          </p>
        </div>
        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5">
          <span className="text-[11px] font-mono uppercase text-[#B8B8B8]">This Year</span>
          <p className="text-2xl font-bold text-[#F5F5F5] mt-1" style={{ fontFamily: "'Oswald', sans-serif" }}>
            {formatINR(summary?.yearExpenses)}
          </p>
        </div>
      </div>

      {/* 3 Charts: Expenses by Category, Branch, Monthly */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
            Expenses by Category
          </h3>
          {summary?.byCategory?.length ? (
            <div className="space-y-2.5">
              {summary.byCategory.slice(0, 7).map((c) => (
                <div key={c.category} className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#F5F5F5] font-semibold">{c.category}</span>
                    <span className="font-mono text-[#EB3E2E]">{formatINR(c.amount)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: chartTheme.track }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.max(5, (c.amount / maxCatAmt) * 100)}%`, backgroundColor: chartTheme.accent }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#858585] py-4">No financial transactions yet.</p>
          )}
        </div>

        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
            Expenses by Branch
          </h3>
          {summary?.byBranch?.some((b) => b.amount > 0) ? (
            <div className="space-y-3">
              {summary.byBranch.map((b) => (
                <div key={b.branchId} className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-bold text-[#F5F5F5]">{b.city}</span>
                    <span className="font-mono text-[#EB3E2E]">{formatINR(b.amount)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: chartTheme.track }}>
                    <div className="h-full rounded-full" style={{ width: `${b.amount > 0 ? Math.max(6, (b.amount / maxBranchAmt) * 100) : 0}%`, backgroundColor: chartTheme.accent }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#858585] py-4">No financial transactions yet.</p>
          )}
        </div>

        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
            Monthly Expenses
          </h3>
          {summary?.monthlyChart?.some((m) => m.amount > 0) ? (
            <div className="h-36 flex items-end gap-1.5 pt-4 border-b" style={{ borderColor: chartTheme.grid }}>
              {summary.monthlyChart.map((m) => {
                const pct = m.amount > 0 ? Math.max(8, (m.amount / maxMonthAmt) * 100) : 2;
                return (
                  <div key={m.monthNumber} className="flex-1 flex flex-col items-center gap-1" title={`${m.month}: ${formatINR(m.amount)}`}>
                    <div className="w-full h-24 rounded-t flex items-end overflow-hidden" style={{ backgroundColor: chartTheme.track }}>
                      <div className="w-full rounded-t" style={{ height: `${pct}%`, backgroundColor: m.amount > 0 ? chartTheme.accent : chartTheme.grid }} />
                    </div>
                    <span className="text-[8px] font-mono" style={{ color: chartTheme.mutedText }}>{m.month}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-[#858585] py-4">No financial transactions yet.</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          loadExpenses();
        }}
        className="bg-[#181818] border border-[#303030] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3"
      >
        <div className="relative lg:col-span-2">
          <Search className="w-3.5 h-3.5 text-[#858585] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search vendor, description, ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#111111] border border-[#303030] rounded-xl text-xs text-[#F5F5F5]"
          />
        </div>
        <select value={branchFilter} onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }} className="bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]">
          <option value="ALL">All Branches</option>
          {branches.map((b) => <option key={b._id} value={b._id}>{b.city}</option>)}
        </select>
        <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]">
          <option value="ALL">All Categories</option>
          {(config?.expenseCategories || []).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]">
          <option value="ACTIVE">Active Expenses</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="ALL">All Statuses</option>
        </select>
        <div className="flex gap-2">
          <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="w-full bg-[#111111] border border-[#303030] rounded-xl px-2 py-2 text-xs text-[#F5F5F5]" />
          <button type="submit" className="px-3 py-2 rounded-xl bg-[#202020] border border-[#303030] text-xs font-bold uppercase text-[#F5F5F5] cursor-pointer">Go</button>
        </div>
      </form>

      {/* Expense List */}
      {loading ? (
        <div className="h-44 rounded-2xl bg-[#181818] border border-[#303030] animate-pulse" />
      ) : expenses.length === 0 ? (
        <EmptyFinanceState title="No expenses recorded yet." subtitle="Record branch rent, electricity, equipment, or staff payouts using Add Expense." />
      ) : (
        <>
          <div className="hidden lg:block bg-[#181818] border border-[#303030] rounded-2xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#111111] text-[10px] font-mono uppercase text-[#B8B8B8] border-b border-[#303030]">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-3 py-3">Branch</th>
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3">Description</th>
                  <th className="px-3 py-3">Vendor</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3">Method</th>
                  <th className="px-3 py-3">Created By</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252525]">
                {expenses.map((e) => (
                  <tr key={e._id} className={e.status === 'CANCELLED' ? 'opacity-55' : ''}>
                    <td className="px-4 py-3 text-[#B8B8B8] whitespace-nowrap">{formatISTDate(e.expenseDate)}</td>
                    <td className="px-3 py-3 font-semibold text-[#F5F5F5]">{e.branchId?.city}</td>
                    <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full bg-[#202020] border border-[#303030] text-[10px] font-mono">{e.category}</span></td>
                    <td className="px-3 py-3 text-[#F5F5F5] max-w-[200px] truncate">{e.description}</td>
                    <td className="px-3 py-3 text-[#B8B8B8]">{e.vendor || '—'}</td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-[#EB3E2E]">{formatINR(e.amount)}</td>
                    <td className="px-3 py-3 font-mono text-[#B8B8B8]">{e.paymentMethod}</td>
                    <td className="px-3 py-3 text-[#B8B8B8]">{e.createdBy?.name || 'Admin'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button type="button" onClick={() => setViewExpense(e)} className="p-1.5 rounded-lg bg-[#202020] border border-[#303030] cursor-pointer"><Eye className="w-3.5 h-3.5" /></button>
                        {e.status === 'ACTIVE' && (
                          <>
                            <button type="button" onClick={() => openEditModal(e)} className="p-1.5 rounded-lg bg-[#202020] border border-[#303030] cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => handleCancelExpense(e)} className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 cursor-pointer"><Ban className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-3">
            {expenses.map((e) => (
              <div key={e._id} className="bg-[#181818] border border-[#303030] rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#EB3E2E] font-bold">{e.category}</span>
                    <p className="font-bold text-[#F5F5F5]">{e.description}</p>
                    <p className="text-[11px] text-[#B8B8B8]">{e.branchId?.city} • {formatISTDate(e.expenseDate)}</p>
                  </div>
                  <span className="font-mono font-bold text-[#EB3E2E]">{formatINR(e.amount)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[#252525]">
                  <span className="text-[11px] text-[#858585]">{e.vendor || e.paymentMethod}</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setViewExpense(e)} className="px-2.5 py-1 rounded-lg bg-[#202020] text-[10px] font-bold uppercase cursor-pointer">View</button>
                    {e.status === 'ACTIVE' && (
                      <>
                        <button type="button" onClick={() => openEditModal(e)} className="px-2.5 py-1 rounded-lg bg-[#202020] text-[10px] font-bold uppercase cursor-pointer">Edit</button>
                        <button type="button" onClick={() => handleCancelExpense(e)} className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-400 text-[10px] font-bold uppercase cursor-pointer">Cancel</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create / Edit Expense Modal */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#181818] border border-[#303030] rounded-2xl overflow-hidden shadow-2xl my-auto">
            <div className="p-5 bg-[#111111] border-b border-[#303030] flex items-center justify-between">
              <h3 className="text-base font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                {editingExpense ? `Edit Expense (${editingExpense.expenseNumber})` : 'Record New Expense'}
              </h3>
              <button type="button" onClick={() => setFormModalOpen(false)} className="p-2 rounded-lg bg-[#202020] cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveExpense} className="p-5 space-y-3 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Expense Date *</label>
                  <input type="date" required value={formState.expenseDate} onChange={(e) => setFormState({ ...formState, expenseDate: e.target.value })} className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Branch *</label>
                  <select required value={formState.branchId} onChange={(e) => setFormState({ ...formState, branchId: e.target.value })} className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]">
                    <option value="">Select Branch...</option>
                    {branches.map((b) => <option key={b._id} value={b._id}>{b.city}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Category *</label>
                  <select required value={formState.category} onChange={(e) => setFormState({ ...formState, category: e.target.value })} className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]">
                    {(activeCategories.length ? activeCategories : [{ name: 'Electricity' }, { name: 'Rent' }, { name: 'Other' }]).map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Amount (₹) *</label>
                  <input type="number" step="0.01" min="0.01" required value={formState.amount} onChange={(e) => setFormState({ ...formState, amount: e.target.value })} className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Description *</label>
                <input type="text" required value={formState.description} onChange={(e) => setFormState({ ...formState, description: e.target.value })} className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Payment Method *</label>
                  <select value={formState.paymentMethod} onChange={(e) => setFormState({ ...formState, paymentMethod: e.target.value })} className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]">
                    {(activeMethods.length ? activeMethods : [{ code: 'CASH', label: 'Cash' }, { code: 'UPI', label: 'UPI' }]).map((m) => (
                      <option key={m.code} value={m.code}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Vendor / Payee</label>
                  <input type="text" value={formState.vendor} onChange={(e) => setFormState({ ...formState, vendor: e.target.value })} className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Reference Number</label>
                  <input type="text" value={formState.referenceNumber} onChange={(e) => setFormState({ ...formState, referenceNumber: e.target.value })} className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Attachment / Bill URL</label>
                  <input type="text" value={formState.attachmentUrl} onChange={(e) => setFormState({ ...formState, attachmentUrl: e.target.value })} className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Notes</label>
                <textarea rows="2" value={formState.notes} onChange={(e) => setFormState({ ...formState, notes: e.target.value })} className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]" />
              </div>
              {editingExpense && (
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#EB3E2E] mb-1">Edit Reason (Audit Trail) *</label>
                  <input type="text" required value={formState.editReason} onChange={(e) => setFormState({ ...formState, editReason: e.target.value })} className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]" />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2 border-t border-[#303030]">
                <button type="button" onClick={() => setFormModalOpen(false)} className="px-4 py-2 rounded-xl bg-[#202020] font-bold uppercase text-[#B8B8B8] cursor-pointer">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl bg-[#EB3E2E] text-white font-bold uppercase cursor-pointer">
                  {submitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense View & Audit Modal */}
      {viewExpense && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#181818] border border-[#303030] rounded-2xl p-5 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-[#303030] pb-3">
              <h3 className="text-base font-bold uppercase text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                {viewExpense.expenseNumber || 'Expense Record'}
              </h3>
              <button type="button" onClick={() => setViewExpense(null)} className="p-1.5 rounded-lg bg-[#202020] cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2">
              <p><strong className="text-[#B8B8B8]">Branch:</strong> {viewExpense.branchId?.city}</p>
              <p><strong className="text-[#B8B8B8]">Category:</strong> {viewExpense.category}</p>
              <p><strong className="text-[#B8B8B8]">Description:</strong> {viewExpense.description}</p>
              <p><strong className="text-[#B8B8B8]">Amount:</strong> <span className="font-mono font-bold text-[#EB3E2E]">{formatINR(viewExpense.amount)}</span></p>
              <p><strong className="text-[#B8B8B8]">Vendor:</strong> {viewExpense.vendor || '—'}</p>
              <p><strong className="text-[#B8B8B8]">Reference:</strong> {viewExpense.referenceNumber || '—'}</p>
              <p><strong className="text-[#B8B8B8]">Notes:</strong> {viewExpense.notes || '—'}</p>
              <p><strong className="text-[#B8B8B8]">Status:</strong> {viewExpense.status}</p>
            </div>
            {viewExpense.auditLogs?.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-[#303030]">
                <p className="font-bold uppercase text-[#B8B8B8] flex items-center gap-1"><History className="w-3.5 h-3.5" /> Audit Log</p>
                {viewExpense.auditLogs.map((l, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-[#111111] border border-[#252525] flex justify-between gap-2 text-[11px]">
                    <span>{l.action}: {l.reason}</span>
                    <span className="text-[#858585]">{formatISTDateTime(l.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
