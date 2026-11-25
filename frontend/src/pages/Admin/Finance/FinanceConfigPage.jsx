import React, { useState, useEffect } from 'react';
import { Plus, Save, Check, CreditCard, Tags, FileText, Globe } from 'lucide-react';
import financeService from '../../../services/financeService.js';

export default function FinanceConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [config, setConfig] = useState(null);

  const [newMethodLabel, setNewMethodLabel] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    financeService
      .getConfig()
      .then((res) => setConfig(res.config))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveConfig = async (updatedConfig = config) => {
    setSaving(true);
    setNotice('');
    try {
      const res = await financeService.updateConfig({
        paymentMethods: updatedConfig.paymentMethods,
        expenseCategories: updatedConfig.expenseCategories,
        invoiceSettings: updatedConfig.invoiceSettings,
      });
      setConfig(res.config);
      setNotice('Finance configuration saved successfully.');
      setTimeout(() => setNotice(''), 3500);
    } catch (err) {
      alert(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return <div className="h-64 rounded-2xl bg-[#181818] border border-[#303030] animate-pulse" />;
  }

  const toggleMethod = (idx) => {
    const next = { ...config, paymentMethods: config.paymentMethods.map((m, i) => (i === idx ? { ...m, isActive: !m.isActive } : m)) };
    setConfig(next);
  };

  const updateMethodLabel = (idx, label) => {
    const next = { ...config, paymentMethods: config.paymentMethods.map((m, i) => (i === idx ? { ...m, label } : m)) };
    setConfig(next);
  };

  const addPaymentMethod = () => {
    if (!newMethodLabel.trim()) return;
    const code = newMethodLabel.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    if (config.paymentMethods.some((m) => m.code === code)) return;
    setConfig({
      ...config,
      paymentMethods: [...config.paymentMethods, { code, label: newMethodLabel.trim(), isActive: true }],
    });
    setNewMethodLabel('');
  };

  const toggleCategory = (idx) => {
    const next = { ...config, expenseCategories: config.expenseCategories.map((c, i) => (i === idx ? { ...c, isActive: !c.isActive } : c)) };
    setConfig(next);
  };

  const updateCategoryName = (idx, name) => {
    const next = { ...config, expenseCategories: config.expenseCategories.map((c, i) => (i === idx ? { ...c, name } : c)) };
    setConfig(next);
  };

  const addExpenseCategory = () => {
    if (!newCategoryName.trim()) return;
    if (config.expenseCategories.some((c) => c.name.toLowerCase() === newCategoryName.trim().toLowerCase())) return;
    setConfig({
      ...config,
      expenseCategories: [...config.expenseCategories, { name: newCategoryName.trim(), isActive: true }],
    });
    setNewCategoryName('');
  };

  const inv = config.invoiceSettings || {};

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#F5F5F5]" style={{ fontFamily: "'Oswald', sans-serif" }}>
            FINANCE CONFIGURATION
          </h2>
          <p className="text-xs text-[#B8B8B8]">
            Manage payment methods, expense categories, invoice prefixes, GST options, and receipt formatting.
          </p>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => handleSaveConfig(config)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#EB3E2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
        </button>
      </div>

      {notice && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{notice}</span>
        </div>
      )}

      {/* Payment Methods & Expense Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[#303030] pb-3">
            <CreditCard className="w-4 h-4 text-[#EB3E2E]" />
            <h3 className="text-sm font-bold uppercase text-[#F5F5F5]">Payment Methods</h3>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add payment method (e.g. GPay)"
              value={newMethodLabel}
              onChange={(e) => setNewMethodLabel(e.target.value)}
              className="flex-1 bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
            />
            <button type="button" onClick={addPaymentMethod} className="px-3 py-2 rounded-xl bg-[#202020] border border-[#303030] text-xs font-bold uppercase text-[#F5F5F5] cursor-pointer">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {config.paymentMethods.map((m, idx) => (
              <div key={m.code} className="p-2.5 rounded-xl bg-[#111111] border border-[#303030] flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={m.label}
                  onChange={(e) => updateMethodLabel(idx, e.target.value)}
                  className="bg-transparent text-xs font-semibold text-[#F5F5F5] focus:outline-none flex-1"
                />
                <span className="text-[10px] font-mono text-[#858585]">{m.code}</span>
                <button
                  type="button"
                  onClick={() => toggleMethod(idx)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase cursor-pointer border ${
                    m.isActive !== false
                      ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400'
                      : 'bg-[#202020] border-[#303030] text-[#858585]'
                  }`}
                >
                  {m.isActive !== false ? 'Active' : 'Inactive'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[#303030] pb-3">
            <Tags className="w-4 h-4 text-[#EB3E2E]" />
            <h3 className="text-sm font-bold uppercase text-[#F5F5F5]">Expense Categories</h3>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add expense category"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1 bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
            />
            <button type="button" onClick={addExpenseCategory} className="px-3 py-2 rounded-xl bg-[#202020] border border-[#303030] text-xs font-bold uppercase text-[#F5F5F5] cursor-pointer">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {config.expenseCategories.map((c, idx) => (
              <div key={`${c.name}-${idx}`} className="p-2.5 rounded-xl bg-[#111111] border border-[#303030] flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={c.name}
                  onChange={(e) => updateCategoryName(idx, e.target.value)}
                  className="bg-transparent text-xs font-semibold text-[#F5F5F5] focus:outline-none flex-1"
                />
                <button
                  type="button"
                  onClick={() => toggleCategory(idx)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase cursor-pointer border ${
                    c.isActive !== false
                      ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400'
                      : 'bg-[#202020] border-[#303030] text-[#858585]'
                  }`}
                >
                  {c.isActive !== false ? 'Active' : 'Inactive'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invoice & Receipt Settings + Financial Defaults */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#181818] border border-[#303030] rounded-2xl p-5 space-y-4 text-xs">
          <div className="flex items-center gap-2.5 border-b border-[#303030] pb-3">
            <FileText className="w-4 h-4 text-[#EB3E2E]" />
            <h3 className="text-sm font-bold uppercase text-[#F5F5F5]">Invoice, GST &amp; Receipt Settings</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Invoice Prefix</label>
              <input
                type="text"
                value={inv.prefix || 'MM'}
                onChange={(e) => setConfig({ ...config, invoiceSettings: { ...inv, prefix: e.target.value.toUpperCase() } })}
                className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Receipt Prefix</label>
              <input
                type="text"
                value={inv.receiptPrefix || 'RCP'}
                onChange={(e) => setConfig({ ...config, invoiceSettings: { ...inv, receiptPrefix: e.target.value.toUpperCase() } })}
                className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Sequence Start</label>
              <input
                type="number"
                min="1"
                value={inv.sequenceStart || 1}
                onChange={(e) => setConfig({ ...config, invoiceSettings: { ...inv, sequenceStart: Number(e.target.value) } })}
                className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Default Due Days</label>
              <input
                type="number"
                min="0"
                value={inv.defaultDueDays ?? 7}
                onChange={(e) => setConfig({ ...config, invoiceSettings: { ...inv, defaultDueDays: Number(e.target.value) } })}
                className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(inv.gstEnabled)}
                onChange={(e) => setConfig({ ...config, invoiceSettings: { ...inv, gstEnabled: e.target.checked } })}
                className="accent-[#EB3E2E]"
              />
              <span className="font-semibold text-[#F5F5F5]">Enable Optional GST</span>
            </label>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">GST Rate (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={inv.gstRate || 0}
                onChange={(e) => setConfig({ ...config, invoiceSettings: { ...inv, gstRate: Number(e.target.value) } })}
                className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">GSTIN (Optional)</label>
              <input
                type="text"
                value={inv.gstNumber || ''}
                onChange={(e) => setConfig({ ...config, invoiceSettings: { ...inv, gstNumber: e.target.value } })}
                className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Receipt Footer Text</label>
            <input
              type="text"
              value={inv.receiptFooter || ''}
              onChange={(e) => setConfig({ ...config, invoiceSettings: { ...inv, receiptFooter: e.target.value } })}
              className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-[#F5F5F5]"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={inv.showBranchAddress !== false}
              onChange={(e) => setConfig({ ...config, invoiceSettings: { ...inv, showBranchAddress: e.target.checked } })}
              className="accent-[#EB3E2E]"
            />
            <span className="text-[#B8B8B8]">Print real branch address &amp; contact number from MongoDB on receipts</span>
          </label>
        </div>

        <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5 space-y-4 text-xs">
          <div className="flex items-center gap-2.5 border-b border-[#303030] pb-3">
            <Globe className="w-4 h-4 text-[#EB3E2E]" />
            <h3 className="text-sm font-bold uppercase text-[#F5F5F5]">Financial Defaults</h3>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-[#111111] border border-[#303030]">
              <span className="text-[10px] font-mono text-[#858585] block">TIMEZONE</span>
              <span className="font-bold text-[#F5F5F5]">{config.defaults?.timezone || 'Asia/Kolkata'} (IST)</span>
            </div>
            <div className="p-3 rounded-xl bg-[#111111] border border-[#303030]">
              <span className="text-[10px] font-mono text-[#858585] block">CURRENCY</span>
              <span className="font-bold text-[#F5F5F5]">
                {config.defaults?.currency || 'INR'} ({config.defaults?.currencySymbol || '₹'})
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#111111] border border-[#303030]">
              <span className="text-[10px] font-mono text-[#858585] block">INVOICE NUMBER FORMAT</span>
              <span className="font-mono font-bold text-[#EB3E2E]">
                {inv.prefix || 'MM'}-KVP-2026-000001
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
