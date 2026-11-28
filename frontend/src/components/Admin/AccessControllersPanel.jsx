import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  Power,
  Activity,
  History,
  AlertTriangle,
  Lock,
  CheckCircle2,
  X,
} from 'lucide-react';
import biometricService from '../../services/biometricService.js';

export default function AccessControllersPanel({ branches = [], branchFilter = 'ALL' }) {
  const [controllers, setControllers] = useState([]);
  const [adapterCatalog, setAdapterCatalog] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    branchId: '',
    name: '',
    doorName: '',
    adapterType: 'MOCK',
    manufacturer: 'Unknown',
    model: 'Unknown',
    endpointUrl: '',
    host: '',
    port: '',
    authType: 'NONE',
    token: '',
    apiKey: '',
    timeoutMs: 3000,
    isEnabled: false,
  });

  const [eventsModal, setEventsModal] = useState({ open: false, controller: null, events: [], loading: false });

  const fetchControllers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await biometricService.getAccessControllers({ branchId: branchFilter });
      setControllers(res.controllers || []);
      setAdapterCatalog(res.adapterCatalog || []);
      setChecklist(res.hardwareDiscoveryChecklist || []);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to load access controllers' });
    } finally {
      setLoading(false);
    }
  }, [branchFilter]);

  useEffect(() => {
    fetchControllers();
  }, [fetchControllers]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const credentials = {};
      if (form.token) credentials.token = form.token;
      if (form.apiKey) credentials.apiKey = form.apiKey;

      await biometricService.registerAccessController({
        branchId: form.branchId || branches[0]?._id,
        name: form.name,
        doorName: form.doorName,
        adapterType: form.adapterType,
        manufacturer: form.manufacturer,
        model: form.model,
        connectionConfig: {
          endpointUrl: form.endpointUrl,
          host: form.host,
          port: form.port ? Number(form.port) : null,
          authType: form.authType,
          timeoutMs: Number(form.timeoutMs) || 3000,
        },
        credentials: Object.keys(credentials).length > 0 ? credentials : null,
        isEnabled: form.isEnabled,
      });
      setFeedback({ type: 'success', text: 'Access controller registered.' });
      setIsAddOpen(false);
      setForm({
        branchId: '',
        name: '',
        doorName: '',
        adapterType: 'MOCK',
        manufacturer: 'Unknown',
        model: 'Unknown',
        endpointUrl: '',
        host: '',
        port: '',
        authType: 'NONE',
        token: '',
        apiKey: '',
        timeoutMs: 3000,
        isEnabled: false,
      });
      fetchControllers();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to register controller' });
    }
  };

  const handleTest = async (id) => {
    setBusyId(id);
    setFeedback(null);
    try {
      const res = await biometricService.testAccessControllerConnection(id);
      setFeedback({
        type: res.healthy ? 'success' : 'error',
        text: res.healthy
          ? `Health check passed (${res.health?.latencyMs || 1}ms).`
          : res.message || res.error || 'Health check failed.',
      });
      fetchControllers();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Connection test failed' });
    } finally {
      setBusyId(null);
    }
  };

  const handleToggle = async (ctrl) => {
    setBusyId(ctrl._id);
    setFeedback(null);
    try {
      await biometricService.toggleAccessController(ctrl._id, !ctrl.isEnabled);
      setFeedback({
        type: 'success',
        text: `${ctrl.name} ${!ctrl.isEnabled ? 'enabled' : 'disabled'} safely.`,
      });
      fetchControllers();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to toggle controller' });
    } finally {
      setBusyId(null);
    }
  };

  const openEvents = async (ctrl) => {
    setEventsModal({ open: true, controller: ctrl, events: [], loading: true });
    try {
      const res = await biometricService.getAccessControllerEvents(ctrl._id);
      setEventsModal({ open: true, controller: ctrl, events: res.events || [], loading: false });
    } catch {
      setEventsModal({ open: true, controller: ctrl, events: [], loading: false });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141414] border border-[#303030] rounded-2xl p-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#EB3E2E]" />
            Physical Access Controllers (Adapter Architecture)
          </h3>
          <p className="text-xs text-[#858585] mt-1">
            Membership-gated door/turnstile controllers. Fails closed on denied/expired membership and preserves emergency egress.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchControllers}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-[#202020] hover:bg-[#2A2A2A] text-[#D4D4D4] border border-[#303030] flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              setForm((prev) => ({ ...prev, branchId: branches[0]?._id || '' }));
              setIsAddOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-bold uppercase bg-[#EB3E2E] hover:bg-[#FF493B] text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Register Controller
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-xs text-[#858585] bg-[#141414] border border-[#303030] rounded-2xl">
          Loading access controllers...
        </div>
      ) : controllers.length === 0 ? (
        <div className="p-8 text-center space-y-2 bg-[#141414] border border-[#303030] rounded-2xl">
          <ShieldCheck className="w-8 h-8 text-[#505050] mx-auto" />
          <div className="text-xs font-semibold text-[#D4D4D4]">No access controllers registered yet</div>
          <p className="text-[11px] text-[#858585]">
            Register a controller (or a Simulation/Mock adapter for testing) once hardware details are confirmed.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {controllers.map((ctrl) => (
            <div key={ctrl._id} className="bg-[#141414] border border-[#303030] rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-[#F5F5F5]">{ctrl.name}</div>
                  <div className="text-[11px] text-[#858585]">
                    {ctrl.branchId?.city || 'Branch'} • Door: <strong className="text-[#D4D4D4]">{ctrl.doorName}</strong>
                  </div>
                  <div className="text-[10px] font-mono text-[#858585] mt-0.5">
                    Adapter: {ctrl.adapterType} • {ctrl.manufacturer} {ctrl.model}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    ctrl.status === 'ONLINE'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : ctrl.status === 'DISABLED'
                        ? 'bg-[#252525] text-[#858585] border-[#353535]'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {ctrl.status}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                <span className="px-2 py-0.5 rounded bg-[#1E1E1E] text-[#B8B8B8]">
                  Unlock: {ctrl.capabilities?.supportsRemoteUnlock ? 'YES' : 'NO'}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#1E1E1E] text-[#B8B8B8]">
                  Door Sensor: {ctrl.capabilities?.supportsDoorStatus ? 'YES' : 'NO'}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#1E1E1E] text-[#B8B8B8]">
                  Credentials: {ctrl.hasCredentials ? 'CONFIGURED' : 'NONE'}
                </span>
              </div>

              {ctrl.lastError && (
                <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                  {ctrl.lastError}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={busyId === ctrl._id}
                  onClick={() => handleTest(ctrl._id)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#202020] hover:bg-[#2A2A2A] text-[#F5F5F5] border border-[#303030] flex items-center gap-1 cursor-pointer"
                >
                  <Activity className="w-3 h-3 text-emerald-400" />
                  Test Health
                </button>
                <button
                  type="button"
                  disabled={busyId === ctrl._id}
                  onClick={() => handleToggle(ctrl)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#202020] hover:bg-[#2A2A2A] text-[#F5F5F5] border border-[#303030] flex items-center gap-1 cursor-pointer"
                >
                  <Power className="w-3 h-3 text-amber-400" />
                  {ctrl.isEnabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  type="button"
                  onClick={() => openEvents(ctrl)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#202020] hover:bg-[#2A2A2A] text-[#F5F5F5] border border-[#303030] flex items-center gap-1 cursor-pointer"
                >
                  <History className="w-3 h-3 text-[#EB3E2E]" />
                  Access Log
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hardware Identification Checklist */}
      {checklist.length > 0 && (
        <div className="bg-[#141414] border border-[#303030] rounded-2xl p-4 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            Unknown Hardware Identification Checklist
          </div>
          <ul className="space-y-1 text-xs text-[#B8B8B8]">
            {checklist.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#858585] mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Register Controller Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <form
            onSubmit={handleRegister}
            className="w-full max-w-lg bg-[#141414] border border-[#303030] rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase text-[#F5F5F5]">Register Access Controller</h4>
              <button type="button" onClick={() => setIsAddOpen(false)} className="text-[#858585] hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <select
                required
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                className="px-3 py-2 bg-[#1C1C1C] border border-[#303030] rounded-xl text-[#F5F5F5]"
              >
                <option value="">Select Branch</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>{b.city}</option>
                ))}
              </select>
              <select
                value={form.adapterType}
                onChange={(e) => setForm({ ...form, adapterType: e.target.value })}
                className="px-3 py-2 bg-[#1C1C1C] border border-[#303030] rounded-xl text-[#F5F5F5]"
              >
                {adapterCatalog.map((a) => (
                  <option key={a.adapterType} value={a.adapterType}>
                    {a.label} {a.implemented ? '' : '(Stub)'}
                  </option>
                ))}
              </select>
              <input
                required
                placeholder="Controller Name (e.g. Main Door Relay)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="px-3 py-2 bg-[#1C1C1C] border border-[#303030] rounded-xl text-[#F5F5F5]"
              />
              <input
                required
                placeholder="Door / Turnstile Name"
                value={form.doorName}
                onChange={(e) => setForm({ ...form, doorName: e.target.value })}
                className="px-3 py-2 bg-[#1C1C1C] border border-[#303030] rounded-xl text-[#F5F5F5]"
              />
              <input
                placeholder="Manufacturer (or Unknown)"
                value={form.manufacturer}
                onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                className="px-3 py-2 bg-[#1C1C1C] border border-[#303030] rounded-xl text-[#F5F5F5]"
              />
              <input
                placeholder="Model (or Unknown)"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="px-3 py-2 bg-[#1C1C1C] border border-[#303030] rounded-xl text-[#F5F5F5]"
              />
              {form.adapterType === 'HTTP_REST' && (
                <>
                  <input
                    placeholder="Endpoint URL (https://...)"
                    value={form.endpointUrl}
                    onChange={(e) => setForm({ ...form, endpointUrl: e.target.value })}
                    className="sm:col-span-2 px-3 py-2 bg-[#1C1C1C] border border-[#303030] rounded-xl text-[#F5F5F5]"
                  />
                  <select
                    value={form.authType}
                    onChange={(e) => setForm({ ...form, authType: e.target.value })}
                    className="px-3 py-2 bg-[#1C1C1C] border border-[#303030] rounded-xl text-[#F5F5F5]"
                  >
                    <option value="NONE">No Auth</option>
                    <option value="BEARER">Bearer Token</option>
                    <option value="API_KEY">X-API-Key</option>
                  </select>
                  <input
                    type="password"
                    placeholder="Secret Token / API Key"
                    value={form.authType === 'API_KEY' ? form.apiKey : form.token}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        ...(form.authType === 'API_KEY' ? { apiKey: e.target.value } : { token: e.target.value }),
                      })
                    }
                    className="px-3 py-2 bg-[#1C1C1C] border border-[#303030] rounded-xl text-[#F5F5F5]"
                  />
                </>
              )}
            </div>
            <label className="flex items-center gap-2 text-xs text-[#D4D4D4]">
              <input
                type="checkbox"
                checked={form.isEnabled}
                onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
              />
              Enable software integration immediately
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsAddOpen(false)} className="px-3 py-2 rounded-xl text-xs bg-[#202020] text-[#B8B8B8] cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl text-xs font-bold bg-[#EB3E2E] text-white cursor-pointer">
                Save Controller
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Access Events Modal */}
      {eventsModal.open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#141414] border border-[#303030] rounded-2xl p-5 space-y-3 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase text-[#F5F5F5]">
                Access Events — {eventsModal.controller?.name}
              </h4>
              <button
                type="button"
                onClick={() => setEventsModal({ open: false, controller: null, events: [], loading: false })}
                className="text-[#858585] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2">
              {eventsModal.loading ? (
                <div className="text-xs text-[#858585] py-6 text-center">Loading events...</div>
              ) : eventsModal.events.length === 0 ? (
                <div className="text-xs text-[#858585] py-6 text-center">No access events recorded yet.</div>
              ) : (
                eventsModal.events.map((ev) => (
                  <div key={ev._id} className="p-2.5 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="font-bold text-[#F5F5F5]">
                        {ev.eventStage} • <span className="text-[#EB3E2E]">{ev.decision}</span>
                      </div>
                      <div className="text-[11px] text-[#858585]">
                        {ev.clientProfileId ? `${ev.clientProfileId.name} (${ev.clientProfileId.clientId}) • ` : ''}
                        {ev.reason} • Physical: {ev.physicalState}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[#858585]">
                      {new Date(ev.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
