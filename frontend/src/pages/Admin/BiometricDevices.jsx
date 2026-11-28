import React, { useState, useEffect, useCallback } from 'react';
import {
  Fingerprint,
  Plus,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  Power,
  Edit,
  X,
  Users,
  Activity,
  Link2,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cpu,
} from 'lucide-react';
import biometricService from '../../services/biometricService.js';
import adminService from '../../services/adminService.js';
import { useAdmin } from '../../components/Admin/AdminLayout.jsx';

const formatLastSeen = (lastSeenAt, lastSeenSecondsAgo = null) => {
  if (!lastSeenAt) return 'Not Connected (Never seen)';
  const diffSec =
    typeof lastSeenSecondsAgo === 'number' && Number.isFinite(lastSeenSecondsAgo)
      ? Math.max(0, Math.floor(lastSeenSecondsAgo))
      : Math.max(0, Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 1000));
  if (diffSec < 60) return `Last seen ${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Last seen ${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Last seen ${diffHr}h ${diffMin % 60}m ago`;
  return new Date(lastSeenAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
};

const getStatusPill = (effectiveStatus) => {
  switch (effectiveStatus) {
    case 'ONLINE':
      return {
        dot: 'bg-emerald-400',
        cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        label: 'ONLINE (Healthy)',
      };
    case 'SYNCING':
    case 'CONNECTING':
      return {
        dot: 'bg-amber-400 animate-pulse',
        cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        label: effectiveStatus,
      };
    case 'DISABLED':
      return {
        dot: 'bg-[#858585]',
        cls: 'bg-[#202020] text-[#858585] border-[#303030]',
        label: 'DISABLED',
      };
    case 'ERROR':
      return {
        dot: 'bg-[#F03B2E]',
        cls: 'bg-[#F03B2E]/15 text-[#FF493B] border-[#F03B2E]/35',
        label: 'ERROR',
      };
    case 'OFFLINE':
    default:
      return {
        dot: 'bg-[#F03B2E]',
        cls: 'bg-[#F03B2E]/15 text-[#FF493B] border-[#F03B2E]/35',
        label: 'OFFLINE / NOT CONNECTED',
      };
  }
};

export default function BiometricDevices() {
  const { branches, selectedBranch } = useAdmin();
  const [activeTab, setActiveTab] = useState('devices'); // 'devices' | 'attendance'
  const [branchFilter, setBranchFilter] = useState(selectedBranch || 'ALL');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [summary, setSummary] = useState({ totalDevices: 0, online: 0, offline: 0, syncing: 0, attendanceToday: 0 });
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Device Detail Drawer
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [deviceDetail, setDeviceDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState('overview'); // 'overview' | 'mappings' | 'logs'

  // Add/Edit Device Modal
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [deviceForm, setDeviceForm] = useState({
    branchId: '',
    deviceName: '',
    manufacturer: 'eSSL',
    model: 'X2008',
    serialNumber: '',
    deviceId: 1,
    macAddress: '',
    localIp: '',
    tcpPort: 4370,
    communicationProtocol: 'ADMS',
    admsServerAddress: '',
    admsServerPort: 8081,
    firmwareVersion: '',
    userCapacity: 1000,
    fingerprintCapacity: 5000,
    faceCapacity: 1500,
  });
  const [savingDevice, setSavingDevice] = useState(false);
  const [deviceModalError, setDeviceModalError] = useState(null);

  // Map User state
  const [clientsList, setClientsList] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [mapBioId, setMapBioId] = useState('');
  const [mapClientProfileId, setMapClientProfileId] = useState('');
  const [mappingBusy, setMappingBusy] = useState(false);

  // Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Biometric Attendance state
  const [attRecords, setAttRecords] = useState([]);
  const [attLoading, setAttLoading] = useState(false);
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [attDeviceId, setAttDeviceId] = useState('ALL');
  const [attVerification, setAttVerification] = useState('ALL');
  const [attMembershipStatus, setAttMembershipStatus] = useState('ALL');
  const [attStatus, setAttStatus] = useState('ALL');
  const [attSearch, setAttSearch] = useState('');
  const [attPage, setAttPage] = useState(1);
  const [attTotalPages, setAttTotalPages] = useState(1);
  const [attTotal, setAttTotal] = useState(0);

  // Enrollment Management & Migration state
  const [enrOverview, setEnrOverview] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [enrLoading, setEnrLoading] = useState(false);
  const [enrStatusFilter, setEnrStatusFilter] = useState('ALL');
  const [enrSearch, setEnrSearch] = useState('');
  const [enrPage, setEnrPage] = useState(1);
  const [enrTotalPages, setEnrTotalPages] = useState(1);
  const [enrTotal, setEnrTotal] = useState(0);
  const [selectedEnrollmentDetail, setSelectedEnrollmentDetail] = useState(null);
  const [enrDetailLoading, setEnrDetailLoading] = useState(false);

  // Manual & Remote Enrollment Form
  const [manualForm, setManualForm] = useState({
    clientProfileId: '',
    deviceId: '',
    biometricUserId: '',
    captureType: 'FACE',
    verifiedByDevice: false,
  });
  const [manualBusy, setManualBusy] = useState(false);

  // Migration state (auto-loads discoveredUsers + bulk mapping + dry-run)
  const [migDeviceId, setMigDeviceId] = useState('');
  const [migFilter, setMigFilter] = useState('ALL');
  const [migSearch, setMigSearch] = useState('');
  const [migPreview, setMigPreview] = useState(null);
  const [migBusy, setMigBusy] = useState(false);
  const [migAssignMap, setMigAssignMap] = useState({});
  const [migSelectedPins, setMigSelectedPins] = useState({});
  const [migBulkReport, setMigBulkReport] = useState(null);

  // Device Commands state
  const [deviceCommandsData, setDeviceCommandsData] = useState({ counts: { pending: 0, sent: 0, completed: 0, failed: 0 }, commands: [] });
  const [commandsLoading, setCommandsLoading] = useState(false);
  const [queueCmdBusy, setQueueCmdBusy] = useState(false);

  const showToast = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback((curr) => (curr?.message === message ? null : curr)), 4500);
  };

  useEffect(() => {
    setBranchFilter(selectedBranch || 'ALL');
  }, [selectedBranch]);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await biometricService.getDevices({ branchId: branchFilter });
      setSummary(res.summary || { totalDevices: 0, online: 0, offline: 0, syncing: 0, attendanceToday: 0 });
      setDevices(res.devices || []);
    } catch (err) {
      showToast('error', err.message || 'Failed to load biometric devices');
    } finally {
      setLoading(false);
    }
  }, [branchFilter]);

  const fetchAttendance = useCallback(async () => {
    setAttLoading(true);
    try {
      const res = await biometricService.getAttendance({
        branchId: branchFilter,
        date: attDate,
        deviceId: attDeviceId,
        verificationMethod: attVerification,
        membershipStatus: attMembershipStatus,
        attendanceStatus: attStatus,
        search: attSearch,
        page: attPage,
        limit: 20,
      });
      setAttRecords(res.records || []);
      setAttTotalPages(res.totalPages || 1);
      setAttTotal(res.total || 0);
    } catch (err) {
      showToast('error', err.message || 'Failed to load biometric attendance');
    } finally {
      setAttLoading(false);
    }
  }, [branchFilter, attDate, attDeviceId, attVerification, attMembershipStatus, attStatus, attSearch, attPage]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAttendance();
    }
  }, [activeTab, fetchAttendance]);

  const fetchClientsForSelector = useCallback(async (searchTerm = clientSearch) => {
    try {
      const res = await adminService.getClients({
        search: searchTerm,
        branchId: branchFilter,
        limit: 100,
      });
      setClientsList(res.clients || []);
    } catch (err) {
      showToast('error', err.message || 'Failed to load members');
    }
  }, [branchFilter, clientSearch]);

  const fetchEnrollmentsData = useCallback(async () => {
    setEnrLoading(true);
    try {
      const [ovRes, listRes] = await Promise.all([
        biometricService.getEnrollmentOverview({ branchId: branchFilter }),
        biometricService.listEnrollments({
          branchId: branchFilter,
          status: enrStatusFilter,
          search: enrSearch,
          page: enrPage,
          limit: 20,
        }),
      ]);
      setEnrOverview(ovRes.overview || null);
      setEnrollments(listRes.enrollments || []);
      setEnrTotalPages(listRes.totalPages || 1);
      setEnrTotal(listRes.total || 0);
    } catch (err) {
      showToast('error', err.message || 'Failed to load enrollment data');
    } finally {
      setEnrLoading(false);
    }
  }, [branchFilter, enrStatusFilter, enrSearch, enrPage]);

  const handleOpenEnrollmentDetail = async (id) => {
    setEnrDetailLoading(true);
    try {
      const res = await biometricService.getEnrollmentDetails(id);
      setSelectedEnrollmentDetail(res);
    } catch (err) {
      showToast('error', err.message || 'Failed to load enrollment details');
    } finally {
      setEnrDetailLoading(false);
    }
  };

  useEffect(() => {
    if (['enrollments', 'manual', 'migration'].includes(activeTab)) {
      fetchEnrollmentsData();
    }
  }, [activeTab, fetchEnrollmentsData]);

  useEffect(() => {
    if (['enrollments', 'manual', 'migration'].includes(activeTab)) {
      fetchClientsForSelector(clientSearch);
    }
  }, [activeTab, fetchClientsForSelector, clientSearch]);

  // Near real-time polling (every 10 seconds)
  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = setInterval(() => {
      fetchDevices();
      if (activeTab === 'attendance') fetchAttendance();
    }, 10000);
    return () => clearInterval(timer);
  }, [autoRefresh, activeTab, fetchDevices, fetchAttendance]);

  const openDeviceDetail = async (id) => {
    setSelectedDeviceId(id);
    setDetailLoading(true);
    setDetailTab('overview');
    try {
      const [detailRes, clientsRes] = await Promise.all([
        biometricService.getDeviceDetails(id),
        adminService.getClients({ limit: 100 }).catch(() => ({ clients: [] })),
      ]);
      setDeviceDetail(detailRes);
      setClientsList(clientsRes.clients || []);
    } catch (err) {
      setSelectedDeviceId(null);
      showToast('error', err.message || 'Failed to load device details');
    } finally {
      setDetailLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingDevice(null);
    setDeviceModalError(null);
    setDeviceForm({
      branchId: branches[0]?._id || '',
      deviceName: '',
      manufacturer: 'eSSL',
      model: 'X2008',
      serialNumber: '',
      deviceId: 1,
      macAddress: '',
      localIp: '',
      tcpPort: 4370,
      communicationProtocol: 'ADMS',
      admsServerAddress: '',
      admsServerPort: 8081,
      firmwareVersion: '',
      userCapacity: 1000,
      fingerprintCapacity: 5000,
      faceCapacity: 1500,
    });
    setIsDeviceModalOpen(true);
  };

  const openEditModal = (d) => {
    setEditingDevice(d);
    setDeviceModalError(null);
    setDeviceForm({
      branchId: d.branchId?._id || d.branchId || '',
      deviceName: d.deviceName || '',
      manufacturer: d.manufacturer || 'eSSL',
      model: d.model || 'X2008',
      serialNumber: d.serialNumber || '',
      deviceId: d.deviceId || 1,
      macAddress: d.macAddress || '',
      localIp: d.localIp || '',
      tcpPort: d.tcpPort || 4370,
      communicationProtocol: d.communicationProtocol || 'ADMS',
      admsServerAddress: d.admsServerAddress || '',
      admsServerPort: d.admsServerPort || 8081,
      firmwareVersion: d.firmwareVersion || '',
      userCapacity: d.userCapacity || 1000,
      fingerprintCapacity: d.fingerprintCapacity || 5000,
      faceCapacity: d.faceCapacity || 1500,
    });
    setIsDeviceModalOpen(true);
  };

  const handleSaveDevice = async (e) => {
    e.preventDefault();
    setDeviceModalError(null);
    setSavingDevice(true);
    try {
      if (editingDevice) {
        await biometricService.updateDevice(editingDevice._id, deviceForm);
        showToast('success', 'Device configuration updated.');
      } else {
        await biometricService.registerDevice(deviceForm);
        showToast('success', 'Biometric device registered.');
      }
      setIsDeviceModalOpen(false);
      await fetchDevices();
      if (selectedDeviceId && editingDevice?._id === selectedDeviceId) {
        openDeviceDetail(selectedDeviceId);
      }
    } catch (err) {
      setDeviceModalError(err.message || 'Failed to save device');
    } finally {
      setSavingDevice(false);
    }
  };

  const handleTestConnection = async (id) => {
    try {
      const res = await biometricService.testConnection(id);
      showToast(res.reachable ? 'success' : 'error', res.message);
      await fetchDevices();
      if (selectedDeviceId === id) openDeviceDetail(id);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleSyncDevice = async (id) => {
    try {
      const res = await biometricService.syncDevice(id);
      showToast(res.synced ? 'success' : 'error', res.message);
      await fetchDevices();
      if (selectedDeviceId === id) openDeviceDetail(id);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const requestToggleDevice = (d) => {
    const nextActive = !d.isActive;
    setConfirmDialog({
      title: nextActive ? 'Enable Biometric Device' : 'Disable Biometric Device',
      description: nextActive
        ? `Enable ${d.deviceName} (${d.serialNumber}) to accept ADMS attendance pushes?`
        : `Disable ${d.deviceName} (${d.serialNumber})? Incoming attendance events will be rejected until re-enabled.`,
      confirmLabel: nextActive ? 'Enable Device' : 'Disable Device',
      onConfirm: async () => {
        try {
          await biometricService.toggleDevice(d._id, nextActive);
          setConfirmDialog(null);
          showToast('success', `Device ${nextActive ? 'enabled' : 'disabled'}.`);
          await fetchDevices();
          if (selectedDeviceId === d._id) openDeviceDetail(d._id);
        } catch (err) {
          setConfirmDialog(null);
          showToast('error', err.message);
        }
      },
    });
  };

  const handleMapUser = async (e) => {
    e.preventDefault();
    if (!selectedDeviceId || !mapBioId || !mapClientProfileId) return;
    setMappingBusy(true);
    try {
      await biometricService.mapUser({
        deviceId: selectedDeviceId,
        biometricUserId: mapBioId,
        clientProfileId: mapClientProfileId,
      });
      setMapBioId('');
      setMapClientProfileId('');
      showToast('success', 'Biometric user mapped to member.');
      openDeviceDetail(selectedDeviceId);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setMappingBusy(false);
    }
  };

  const requestUnmapUser = (mapping) => {
    setConfirmDialog({
      title: 'Unmap Biometric User',
      description: `Remove mapping for Biometric ID ${mapping.biometricUserId}? Future punches for this ID will appear as UNMAPPED until re-mapped.`,
      confirmLabel: 'Unmap User',
      onConfirm: async () => {
        try {
          await biometricService.unmapUser(mapping._id);
          setConfirmDialog(null);
          showToast('success', 'Mapping removed.');
          if (selectedDeviceId) openDeviceDetail(selectedDeviceId);
        } catch (err) {
          setConfirmDialog(null);
          showToast('error', err.message);
        }
      },
    });
  };

  const handleManualEnroll = async (e) => {
    e.preventDefault();
    if (!manualForm.clientProfileId || !manualForm.deviceId) {
      showToast('error', 'Please select both a member and a biometric device.');
      return;
    }
    setManualBusy(true);
    try {
      await biometricService.completeManualEnrollment(manualForm);
      showToast('success', 'Manual physical enrollment confirmed and mapped.');
      setManualForm({ clientProfileId: '', deviceId: manualForm.deviceId, biometricUserId: '', captureType: 'FACE', verifiedByDevice: false });
      fetchEnrollmentsData();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setManualBusy(false);
    }
  };

  const handleRemoteEnroll = async () => {
    if (!manualForm.clientProfileId || !manualForm.deviceId) {
      showToast('error', 'Please select both a member and a biometric device.');
      return;
    }
    setManualBusy(true);
    try {
      await biometricService.initiateRemoteEnrollment(manualForm);
      showToast('success', 'Remote enrollment initiated. Waiting for physical device capture.');
      fetchEnrollmentsData();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setManualBusy(false);
    }
  };

  const handleApproveEnrollment = async (enr) => {
    try {
      await biometricService.approveEnrollment(enr._id, {});
      showToast('success', 'Enrollment approved and queued for physical X2008 capture.');
      fetchEnrollmentsData();
      if (selectedEnrollmentDetail?._id === enr._id) setSelectedEnrollmentDetail(null);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleRejectEnrollment = async (enr) => {
    const reason = window.prompt('Enter rejection reason (member will be notified to retake):', 'Lighting or face alignment unclear');
    if (!reason) return;
    try {
      await biometricService.rejectEnrollment(enr._id, reason);
      showToast('success', 'Enrollment request rejected.');
      fetchEnrollmentsData();
      if (selectedEnrollmentDetail?._id === enr._id) setSelectedEnrollmentDetail(null);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleRetryEnrollmentSync = async (enr) => {
    try {
      const res = await biometricService.retryEnrollmentSync(enr._id);
      const jobStatus = res.job?.status;
      if (jobStatus === 'VERIFIED' || jobStatus === 'ACKNOWLEDGED') {
        showToast('success', 'Device user verified and ready for physical face capture.');
      } else {
        showToast('error', res.job?.failureReason || 'Device user sync failed.');
      }
      fetchEnrollmentsData();
      if (selectedEnrollmentDetail?.enrollment?._id === enr._id) {
        handleOpenEnrollmentDetail(enr._id);
      }
    } catch (err) {
      showToast('error', err.message || 'Retry sync failed');
    }
  };

  const fetchDeviceCommands = useCallback(async (id) => {
    if (!id) return;
    setCommandsLoading(true);
    try {
      const res = await biometricService.getDeviceCommands(id);
      setDeviceCommandsData({ counts: res.counts || { pending: 0, sent: 0, completed: 0, failed: 0 }, commands: res.commands || [] });
    } catch (err) {
      showToast('error', err.message || 'Failed to load device commands');
    } finally {
      setCommandsLoading(false);
    }
  }, []);

  const handleQueueCommand = async (commandType) => {
    if (!selectedDeviceId) return;
    setQueueCmdBusy(true);
    try {
      await biometricService.queueDeviceCommand(selectedDeviceId, { commandType });
      showToast('success', `Queued read-only command ${commandType}.`);
      fetchDeviceCommands(selectedDeviceId);
    } catch (err) {
      showToast('error', err.message || 'Failed to queue command');
    } finally {
      setQueueCmdBusy(false);
    }
  };

  const handleCancelCommand = async (cmdId) => {
    try {
      await biometricService.cancelDeviceCommand(cmdId);
      showToast('success', 'Command cancelled.');
      if (selectedDeviceId) fetchDeviceCommands(selectedDeviceId);
    } catch (err) {
      showToast('error', err.message || 'Failed to cancel command');
    }
  };

  const loadMigrationPreview = useCallback(async (targetDeviceId = migDeviceId, filterVal = migFilter, searchVal = migSearch) => {
    if (!targetDeviceId) {
      setMigPreview(null);
      return;
    }
    setMigBusy(true);
    try {
      const res = await biometricService.getMigrationPreview({
        deviceId: targetDeviceId,
        filter: filterVal,
        search: searchVal,
      });
      setMigPreview(res);
      setMigAssignMap((prev) => {
        const next = { ...prev };
        for (const u of res.users || []) {
          if (u.mappingStatus === 'UNMAPPED' && !next[u.biometricUserId] && u.suggestedClient?.clientProfileId) {
            next[u.biometricUserId] = u.suggestedClient.clientProfileId;
          }
        }
        return next;
      });
    } catch (err) {
      showToast('error', err.message || 'Failed to load discovered device users');
    } finally {
      setMigBusy(false);
    }
  }, [migDeviceId, migFilter, migSearch]);

  const defaultMigDeviceId = devices[0]?._id || '';
  useEffect(() => {
    if (activeTab === 'migration') {
      const targetId = migDeviceId || defaultMigDeviceId;
      if (!migDeviceId && targetId) setMigDeviceId(targetId);
      if (targetId) loadMigrationPreview(targetId, migFilter, migSearch);
    }
  }, [activeTab, migDeviceId, migFilter, migSearch, defaultMigDeviceId, loadMigrationPreview]);

  const handleMapMigrationRow = async (bioId) => {
    const clientProfileId = migAssignMap[bioId];
    if (!clientProfileId || !migDeviceId) {
      showToast('error', 'Select a matching member before mapping.');
      return;
    }
    try {
      await biometricService.mapUser({ deviceId: migDeviceId, biometricUserId: bioId, clientProfileId });
      showToast('success', `Mapped Biometric ID ${bioId}.`);
      await loadMigrationPreview(migDeviceId, migFilter, migSearch);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleBulkMapMigration = async (dryRun = false) => {
    if (!migDeviceId) return;
    const selectedMappings = Object.entries(migSelectedPins)
      .filter(([, checked]) => checked)
      .map(([bioId]) => ({
        biometricUserId: bioId,
        clientProfileId: migAssignMap[bioId] || '',
      }))
      .filter((m) => m.clientProfileId);

    if (selectedMappings.length === 0) {
      showToast('error', 'Select at least one unmapped user with a chosen member.');
      return;
    }

    setMigBusy(true);
    try {
      const res = await biometricService.bulkMapMigration({
        deviceId: migDeviceId,
        mappings: selectedMappings,
        dryRun,
      });
      setMigBulkReport(res);
      showToast(
        res.failedCount === 0 ? 'success' : 'error',
        dryRun
          ? `Dry run complete: ${res.succeededCount} valid, ${res.failedCount} conflict(s).`
          : `Bulk mapping complete: ${res.succeededCount} mapped, ${res.failedCount} failed.`
      );
      if (!dryRun) {
        setMigSelectedPins({});
        await loadMigrationPreview(migDeviceId, migFilter, migSearch);
      }
    } catch (err) {
      showToast('error', err.message || 'Bulk mapping failed');
    } finally {
      setMigBusy(false);
    }
  };

  return (
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="mm-page-title text-2xl sm:text-3xl">BIOMETRIC DEVICES &amp; ADMS</h2>
          <p className="text-xs sm:text-sm text-[#B8B8B8] mt-1">
            Multi-branch biometric hardware monitoring, user mapping, and live attendance feed.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRefresh((v) => !v)}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase border inline-flex items-center gap-2 cursor-pointer ${
              autoRefresh
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-[#202020] text-[#B8B8B8] border-[#303030]'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
            <span>{autoRefresh ? 'Live (10s)' : 'Paused'}</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#F03B2E] hover:bg-[#FF493B] text-white inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Device</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-200'
              : 'bg-[#F03B2E]/10 border-[#F03B2E]/40 text-[#FF6A5E]'
          }`}
        >
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'TOTAL DEVICES', value: summary.totalDevices, tone: 'text-[#F5F5F5]' },
          { label: 'ONLINE', value: summary.online, tone: 'text-emerald-400' },
          { label: 'OFFLINE', value: summary.offline, tone: 'text-[#FF493B]' },
          { label: 'SYNCING', value: summary.syncing, tone: 'text-amber-400' },
          { label: 'ATTENDANCE TODAY', value: summary.attendanceToday, tone: 'text-[#F03B2E]' },
        ].map((k, idx) => (
          <div key={idx} className="bg-[#181818] border border-[#303030] rounded-2xl p-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#858585] block">
              {k.label}
            </span>
            <span className={`text-2xl font-bold font-mono mt-1 block ${k.tone}`}>{k.value}</span>
          </div>
        ))}
      </div>

      {/* Tabs + Branch Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: 'devices', label: `Branch Devices (${devices.length})` },
            { key: 'enrollments', label: 'Enrollment Requests' },
            { key: 'manual', label: 'Member Enrollment' },
            { key: 'migration', label: 'Existing Users Migration' },
            { key: 'attendance', label: 'Biometric Attendance' },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border cursor-pointer ${
                activeTab === t.key
                  ? 'bg-[#F03B2E] text-white border-[#F03B2E]'
                  : 'bg-[#181818] text-[#B8B8B8] border-[#303030]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <select
          aria-label="Filter by branch"
          value={branchFilter}
          onChange={(e) => {
            setBranchFilter(e.target.value);
            setAttPage(1);
          }}
          className="min-h-[44px] px-3 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5]"
        >
          <option value="ALL">All Branches</option>
          {branches.map((b) => (
            <option key={b._id} value={b._id}>
              {b.city} Branch
            </option>
          ))}
        </select>
      </div>

      {/* ── DEVICES GRID ── */}
      {activeTab === 'devices' && (
        loading ? (
          <div className="bg-[#181818] border border-[#303030] rounded-2xl py-12 text-center text-xs text-[#B8B8B8]">
            Loading biometric hardware status...
          </div>
        ) : devices.length === 0 ? (
          <div className="bg-[#181818] border border-[#303030] rounded-2xl py-12 px-4 text-center space-y-3">
            <Fingerprint className="w-8 h-8 text-[#F03B2E] mx-auto" />
            <p className="text-sm font-bold text-[#F5F5F5]">No Biometric Devices Registered</p>
            <p className="text-xs text-[#858585]">
              Add your branch eSSL X2008 device to monitor ADMS heartbeats and live attendance.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[#F03B2E] text-white text-xs font-bold uppercase cursor-pointer"
            >
              Add First Device
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((d) => {
              const pill = getStatusPill(d.effectiveStatus);
              return (
                <div
                  key={d._id}
                  onClick={() => openDeviceDetail(d._id)}
                  className="bg-[#181818] hover:bg-[#202020] border border-[#303030] hover:border-[#F03B2E] rounded-2xl p-5 space-y-4 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-[#F03B2E] font-bold block">
                          {d.branchId?.city || 'Branch'} • ID #{d.deviceId}
                        </span>
                        <h3 className="font-display text-lg font-bold uppercase text-[#F5F5F5]">
                          {d.deviceName}
                        </h3>
                        <p className="text-xs text-[#B8B8B8]">
                          {d.manufacturer} {d.model} • SN: <span className="font-mono">{d.serialNumber}</span>
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border whitespace-nowrap ${pill.cls}`}>
                        <span className={`w-2 h-2 rounded-full ${pill.dot}`} />
                        {pill.label}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#111111] border border-[#252525] text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[#858585]">Last Seen</span>
                        <span className="font-mono text-[#F5F5F5]">{formatLastSeen(d.lastSeenAt, d.lastSeenSecondsAgo)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#858585]">Today Check-ins</span>
                        <span className="font-mono font-bold text-[#F03B2E]">{d.todayAttendanceCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#858585]">Protocol / Port</span>
                        <span className="font-mono text-[#B8B8B8]">
                          {d.communicationProtocol} : {d.admsServerPort}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-lg bg-[#111111] border border-[#252525]">
                        <span className="text-[10px] text-[#858585] block">Users</span>
                        <span className="font-mono font-bold text-[#F5F5F5]">{d.userCount || 0}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#111111] border border-[#252525]">
                        <span className="text-[10px] text-[#858585] block">Face</span>
                        <span className="font-mono font-bold text-[#F5F5F5]">{d.faceCount || 0}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#111111] border border-[#252525]">
                        <span className="text-[10px] text-[#858585] block">Finger</span>
                        <span className="font-mono font-bold text-[#F5F5F5]">{d.fingerprintCount || 0}</span>
                      </div>
                    </div>

                    {(d.effectiveStatus === 'OFFLINE' || d.effectiveStatus === 'ERROR') && (
                      <div className="p-2.5 rounded-lg bg-[#F03B2E]/10 border border-[#F03B2E]/30 text-[11px] text-[#FF6A5E]">
                        <strong>Device offline:</strong> {d.errorMessage || 'Check device network / ADMS configuration.'}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[#252525]" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleTestConnection(d._id)}
                      className="flex-1 min-h-[38px] px-2.5 py-1.5 rounded-lg bg-[#202020] hover:bg-[#303030] border border-[#303030] text-[11px] font-bold uppercase text-[#F5F5F5] cursor-pointer"
                    >
                      Test
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSyncDevice(d._id)}
                      className="flex-1 min-h-[38px] px-2.5 py-1.5 rounded-lg bg-[#202020] hover:bg-[#303030] border border-[#303030] text-[11px] font-bold uppercase text-[#F5F5F5] cursor-pointer"
                    >
                      Sync
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeviceDetail(d._id)}
                      className="flex-1 min-h-[38px] px-2.5 py-1.5 rounded-lg bg-[#F03B2E]/15 hover:bg-[#F03B2E]/25 border border-[#F03B2E]/35 text-[11px] font-bold uppercase text-[#F5F5F5] cursor-pointer"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── BIOMETRIC ATTENDANCE TAB ── */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="bg-[#111111] border border-[#303030] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-[#858585] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={attSearch}
                onChange={(e) => {
                  setAttSearch(e.target.value);
                  setAttPage(1);
                }}
                placeholder="Search name, MM ID, Bio ID..."
                className="w-full min-h-[44px] pl-9 pr-3 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5]"
              />
            </div>

            <input
              type="date"
              value={attDate}
              onChange={(e) => {
                setAttDate(e.target.value);
                setAttPage(1);
              }}
              className="w-full min-h-[44px] px-3 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] font-mono"
            />

            <select
              value={attDeviceId}
              onChange={(e) => {
                setAttDeviceId(e.target.value);
                setAttPage(1);
              }}
              className="w-full min-h-[44px] px-3 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5]"
            >
              <option value="ALL">All Devices</option>
              {devices.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.deviceName} ({d.branchId?.city})
                </option>
              ))}
            </select>

            <select
              value={attVerification}
              onChange={(e) => {
                setAttVerification(e.target.value);
                setAttPage(1);
              }}
              className="w-full min-h-[44px] px-3 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5]"
            >
              <option value="ALL">All Methods</option>
              <option value="FACE">FACE</option>
              <option value="FINGERPRINT">FINGERPRINT</option>
              <option value="CARD">CARD</option>
              <option value="PASSWORD">PASSWORD</option>
            </select>

            <select
              value={attStatus}
              onChange={(e) => {
                setAttStatus(e.target.value);
                setAttPage(1);
              }}
              className="w-full min-h-[44px] px-3 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5]"
            >
              <option value="ALL">All Attendance Status</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FLAGGED_EXPIRED">FLAGGED_EXPIRED</option>
              <option value="FLAGGED_SUSPENDED">FLAGGED_SUSPENDED</option>
              <option value="FLAGGED_NO_MEMBERSHIP">FLAGGED_NO_MEMBERSHIP</option>
              <option value="UNMAPPED_USER">UNMAPPED_USER</option>
            </select>
          </div>

          <div className="bg-[#181818] border border-[#303030] rounded-2xl overflow-hidden">
            {attLoading ? (
              <div className="py-12 text-center text-xs text-[#B8B8B8]">Loading biometric attendance...</div>
            ) : attRecords.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#858585] italic">
                No biometric attendance events recorded for this date and filter selection.
              </div>
            ) : (
              <>
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#303030] bg-[#111111] text-[10px] font-mono uppercase text-[#B8B8B8]">
                        <th className="py-3 px-4">Member</th>
                        <th className="py-3 px-4">Member ID</th>
                        <th className="py-3 px-4">Branch</th>
                        <th className="py-3 px-4">Device</th>
                        <th className="py-3 px-4">Verification</th>
                        <th className="py-3 px-4">Check-in Time</th>
                        <th className="py-3 px-4">Membership</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#252525]">
                      {attRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-[#202020]">
                          <td className="py-3 px-4 font-bold text-[#F5F5F5]">{r.memberName}</td>
                          <td className="py-3 px-4 font-mono text-[#F03B2E] font-bold">{r.memberId}</td>
                          <td className="py-3 px-4">{r.branch}</td>
                          <td className="py-3 px-4 text-[#B8B8B8]">{r.device}</td>
                          <td className="py-3 px-4 font-mono">{r.verificationMethod}</td>
                          <td className="py-3 px-4 font-mono">
                            {new Date(r.checkInTime).toLocaleTimeString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4 font-mono">{r.membershipStatus}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                r.attendanceStatus === 'SUCCESS'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              }`}
                            >
                              {r.attendanceStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="lg:hidden divide-y divide-[#252525]">
                  {attRecords.map((r) => (
                    <div key={r.id} className="p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#F5F5F5]">{r.memberName}</span>
                        <span className="font-mono font-bold text-[#F03B2E]">{r.memberId}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#B8B8B8] font-mono text-[11px]">
                        <span>{r.branch} • {r.verificationMethod}</span>
                        <span>
                          {new Date(r.checkInTime).toLocaleTimeString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-[#858585]">Membership: {r.membershipStatus}</span>
                        <span className="text-[10px] font-mono font-bold text-amber-400">{r.attendanceStatus}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {attTotalPages > 1 && (
              <div className="px-4 py-3 border-t border-[#303030] flex items-center justify-between text-xs text-[#B8B8B8]">
                <span>Total: {attTotal} • Page {attPage} of {attTotalPages}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={attPage <= 1}
                    onClick={() => setAttPage((p) => p - 1)}
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-[#202020] border border-[#303030] disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={attPage >= attTotalPages}
                    onClick={() => setAttPage((p) => p + 1)}
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-[#202020] border border-[#303030] disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ENROLLMENT REQUESTS & OVERVIEW TAB ── */}
      {activeTab === 'enrollments' && (
        <div className="space-y-4">
          {enrOverview && (
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              {[
                { label: 'Total Members', value: enrOverview.totalMembers },
                { label: 'Enrolled', value: enrOverview.enrolledCount },
                { label: 'Pending', value: enrOverview.pendingCount },
                { label: 'Review Requests', value: enrOverview.requestsCount },
                { label: 'Failed / Rejected', value: enrOverview.failedCount },
                { label: 'Completion %', value: `${enrOverview.completionPercentage}%` },
              ].map((k, idx) => (
                <div key={idx} className="bg-[#181818] border border-[#303030] rounded-2xl p-3.5">
                  <span className="text-[10px] font-mono uppercase text-[#858585] block">{k.label}</span>
                  <span className="text-xl font-bold font-mono text-[#F5F5F5] mt-1 block">{k.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="bg-[#111111] border border-[#303030] rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={enrSearch}
              onChange={(e) => setEnrSearch(e.target.value)}
              placeholder="Search member name, Client ID (MM...), phone, Bio ID..."
              className="min-h-[44px] px-3.5 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5]"
            />
            <select
              value={enrStatusFilter}
              onChange={(e) => setEnrStatusFilter(e.target.value)}
              className="min-h-[44px] px-3 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5]"
            >
              <option value="ALL">All Statuses</option>
              <option value="CAPTURE_SUBMITTED">Capture Submitted (Needs Review)</option>
              <option value="DEVICE_USER_SYNCING">Device User Syncing</option>
              <option value="DEVICE_USER_READY">Device User Ready</option>
              <option value="AWAITING_PHYSICAL_ENROLLMENT">Awaiting Physical Enrollment</option>
              <option value="ENROLLED">Enrolled</option>
              <option value="REJECTED">Rejected</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          <div className="bg-[#181818] border border-[#303030] rounded-2xl overflow-hidden">
            {enrLoading ? (
              <div className="py-12 text-center text-xs text-[#B8B8B8]">Loading enrollment requests...</div>
            ) : enrollments.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#858585] italic">
                No biometric enrollment requests match the selected filters.
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#303030] bg-[#111111] text-[10px] font-mono uppercase text-[#B8B8B8]">
                        <th className="py-3 px-4">Member</th>
                        <th className="py-3 px-4">Client ID</th>
                        <th className="py-3 px-4">Branch</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4">Capture</th>
                        <th className="py-3 px-4">Device Status</th>
                        <th className="py-3 px-4">Overall</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#252525]">
                      {enrollments.map((enr) => (
                        <tr key={enr._id} className="hover:bg-[#202020]">
                          <td className="py-3 px-4 font-bold text-[#F5F5F5]">{enr.clientProfileId?.name || '—'}</td>
                          <td className="py-3 px-4 font-mono text-[#F03B2E] font-bold">{enr.clientProfileId?.clientId || '—'}</td>
                          <td className="py-3 px-4">{enr.branchId?.city || '—'}</td>
                          <td className="py-3 px-4 font-mono">{enr.enrollmentMethod}</td>
                          <td className="py-3 px-4 font-mono">{enr.mobileCaptureStatus}</td>
                          <td className="py-3 px-4 font-mono">{enr.deviceEnrollmentStatus}</td>
                          <td className="py-3 px-4 font-mono font-bold text-amber-400">{enr.status}</td>
                          <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleOpenEnrollmentDetail(enr._id)}
                              className="px-2.5 py-1 rounded bg-[#202020] hover:bg-[#303030] border border-[#303030] text-[#F5F5F5] text-[11px] font-bold uppercase cursor-pointer"
                            >
                              Details
                            </button>
                            {['CAPTURE_SUBMITTED', 'PENDING_REVIEW'].includes(enr.status) && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveEnrollment(enr)}
                                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold uppercase cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectEnrollment(enr)}
                                  className="px-2.5 py-1 rounded bg-[#F03B2E]/20 text-[#FF493B] border border-[#F03B2E]/40 text-[11px] font-bold uppercase cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {enr.status !== 'ENROLLED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setManualForm({
                                    enrollmentId: enr._id,
                                    clientProfileId: enr.clientProfileId?._id || '',
                                    deviceId: enr.assignedDeviceId?._id || devices[0]?._id || '',
                                    biometricUserId: enr.biometricUserId || '',
                                    captureType: 'FACE',
                                    verifiedByDevice: false,
                                  });
                                  setActiveTab('manual');
                                }}
                                className="px-2.5 py-1 rounded bg-[#F03B2E] hover:bg-[#FF493B] text-white text-[11px] font-bold uppercase cursor-pointer"
                              >
                                Complete on Device
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden divide-y divide-[#252525]">
                  {enrollments.map((enr) => (
                    <div key={enr._id} className="p-4 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#F5F5F5]">{enr.clientProfileId?.name || '—'}</span>
                        <span className="font-mono font-bold text-[#F03B2E]">{enr.clientProfileId?.clientId || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-[#B8B8B8]">
                        <span>{enr.branchId?.city || '—'} • {enr.enrollmentMethod}</span>
                        <span className="text-amber-400 font-bold">{enr.status}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEnrollmentDetail(enr._id)}
                          className="min-h-[38px] px-3 py-1 rounded-lg bg-[#202020] border border-[#303030] text-[#F5F5F5] text-[11px] font-bold uppercase cursor-pointer"
                        >
                          View Details
                        </button>
                        {['CAPTURE_SUBMITTED', 'PENDING_REVIEW'].includes(enr.status) && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApproveEnrollment(enr)}
                              className="min-h-[38px] px-3 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold uppercase cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectEnrollment(enr)}
                              className="min-h-[38px] px-3 py-1 rounded-lg bg-[#F03B2E]/20 text-[#FF493B] border border-[#F03B2E]/40 text-[11px] font-bold uppercase cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {enrTotalPages > 1 && (
              <div className="px-4 py-3 border-t border-[#303030] flex items-center justify-between text-xs text-[#B8B8B8]">
                <span>Total: {enrTotal} • Page {enrPage} of {enrTotalPages}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={enrPage <= 1}
                    onClick={() => setEnrPage((p) => p - 1)}
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-[#202020] border border-[#303030] disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={enrPage >= enrTotalPages}
                    onClick={() => setEnrPage((p) => p + 1)}
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-[#202020] border border-[#303030] disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MANUAL & REMOTE ENROLLMENT TAB (METHODS A & B) ── */}
      {activeTab === 'manual' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <form onSubmit={handleManualEnroll} className="bg-[#181818] border border-[#303030] rounded-2xl p-5 space-y-4 text-xs">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#F03B2E] font-bold block">METHOD A &amp; B</span>
              <h3 className="mm-page-title text-lg">PHYSICAL &amp; REMOTE ENROLLMENT</h3>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Search &amp; Select Member *</label>
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Search by Client ID (MM...), name, phone, or email..."
                className="w-full min-h-[40px] mb-2 bg-[#111111] border border-[#303030] rounded-xl px-3 text-[#F5F5F5]"
              />
              <select
                required
                value={manualForm.clientProfileId}
                onChange={(e) => setManualForm({ ...manualForm, clientProfileId: e.target.value })}
                className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 text-[#F5F5F5]"
              >
                <option value="">Choose a Man &amp; Machine member</option>
                {clientsList.map((c) => (
                  <option key={c.profileId || c.id} value={c.profileId || ''} disabled={!c.profileId}>
                    {c.clientId || '—'} — {c.name} ({c.phone || 'No phone'}) {!c.profileId ? '[No ClientProfile — cannot enroll]' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Biometric Device *</label>
                <select
                  required
                  value={manualForm.deviceId}
                  onChange={(e) => setManualForm({ ...manualForm, deviceId: e.target.value })}
                  className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 text-[#F5F5F5]"
                >
                  <option value="">Select device</option>
                  {devices.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.branchId?.city} — {d.deviceName} ({d.model})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Biometric User ID (Auto if blank)</label>
                <input
                  type="text"
                  value={manualForm.biometricUserId}
                  onChange={(e) => setManualForm({ ...manualForm, biometricUserId: e.target.value })}
                  placeholder="e.g. 1001"
                  className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 text-[#F5F5F5] font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Capture Type</label>
                <select
                  value={manualForm.captureType}
                  onChange={(e) => setManualForm({ ...manualForm, captureType: e.target.value })}
                  className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 text-[#F5F5F5]"
                >
                  <option value="FACE">Face</option>
                  <option value="FINGERPRINT">Fingerprint</option>
                  <option value="BOTH">Face + Fingerprint</option>
                </select>
              </div>
              <label className="flex items-center gap-2 min-h-[44px] px-3 rounded-xl bg-[#111111] border border-[#303030] text-[#F5F5F5] cursor-pointer self-end">
                <input
                  type="checkbox"
                  checked={manualForm.verifiedByDevice}
                  onChange={(e) => setManualForm({ ...manualForm, verifiedByDevice: e.target.checked })}
                />
                <span>Verified on X2008 User List</span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="submit"
                disabled={manualBusy}
                className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-[#F03B2E] hover:bg-[#FF493B] text-white font-bold uppercase cursor-pointer"
              >
                {manualBusy ? 'Saving...' : 'Confirm Manual Enrollment'}
              </button>
              <button
                type="button"
                disabled={manualBusy}
                onClick={handleRemoteEnroll}
                className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-[#202020] hover:bg-[#303030] border border-[#303030] text-[#F5F5F5] font-bold uppercase cursor-pointer"
              >
                Initiate Remote Face Enrollment
              </button>
            </div>
          </form>

          <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5 space-y-3 text-xs text-[#B8B8B8]">
            <h4 className="font-display text-base font-bold uppercase text-[#F5F5F5]">
              eSSL X2008 Physical Enrollment Guide
            </h4>
            <ol className="space-y-2 list-decimal list-inside leading-relaxed">
              <li>Select the member and branch device on the left.</li>
              <li>On the physical eSSL X2008, open <strong>Menu → User Mgt → New User</strong>.</li>
              <li>Enter the exact <strong>Biometric User ID</strong> shown/assigned in Man &amp; Machine.</li>
              <li>Capture the member&apos;s <strong>Face (Face VX3.5)</strong> or <strong>Fingerprint (Finger VX10.0)</strong> on the terminal and save.</li>
              <li>Click <strong>Confirm Manual Enrollment</strong> to store the permanent Member ↔ Biometric ID mapping.</li>
            </ol>
            <p className="text-[11px] text-[#858585] pt-2 border-t border-[#252525]">
              Note: Standard ADMS push firmware (ZMM510-NF24VB-Ver1.3.13) does not support remote unattended face capture; clicking Remote Enrollment will honestly report firmware capability.
            </p>
          </div>
        </div>
      )}

      {/* ── EXISTING BIOMETRIC USERS MIGRATION TAB ── */}
      {activeTab === 'migration' && (
        <div className="space-y-4">
          <div className="bg-[#181818] border border-[#303030] rounded-2xl p-5 space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#F03B2E] font-bold block">NON-DESTRUCTIVE MIGRATION</span>
                <h3 className="mm-page-title text-lg">EXISTING DEVICE USERS MIGRATION</h3>
                <p className="text-[#B8B8B8] mt-1">
                  Automatically loads users discovered from the device&apos;s ADMS OPERLOG. Review match suggestions, run a dry-run check, and confirm mappings in MongoDB without modifying X2008 templates.
                </p>
              </div>
              <button
                type="button"
                disabled={migBusy || !migDeviceId}
                onClick={() => loadMigrationPreview(migDeviceId, migFilter, migSearch)}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-[#202020] hover:bg-[#303030] border border-[#303030] text-[#F5F5F5] font-bold uppercase inline-flex items-center gap-2 cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${migBusy ? 'animate-spin' : ''}`} />
                <span>Refresh Discovered</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={migDeviceId}
                onChange={(e) => {
                  setMigDeviceId(e.target.value);
                  setMigSelectedPins({});
                  setMigBulkReport(null);
                }}
                className="min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 text-[#F5F5F5]"
              >
                <option value="">Select Target Device</option>
                {devices.map((d) => (
                  <option key={d._id} value={d._id}>{d.branchId?.city} — {d.deviceName}</option>
                ))}
              </select>

              <select
                value={migFilter}
                onChange={(e) => setMigFilter(e.target.value)}
                className="min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 text-[#F5F5F5]"
              >
                <option value="ALL">All Discovered Users</option>
                <option value="UNMAPPED">Unmapped Only</option>
                <option value="MAPPED">Mapped Only</option>
                <option value="DUPLICATES">Potential Duplicates</option>
                <option value="CONFLICTS">Conflicts</option>
              </select>

              <input
                type="text"
                value={migSearch}
                onChange={(e) => setMigSearch(e.target.value)}
                placeholder="Search PIN, device name, or member..."
                className="min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 text-[#F5F5F5]"
              />
            </div>
          </div>

          {migPreview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div className="bg-[#181818] border border-[#303030] rounded-xl p-3.5">
                  <span className="text-[10px] font-mono uppercase text-[#858585] block">Discovered</span>
                  <span className="text-xl font-bold font-mono text-[#F5F5F5]">{migPreview.summary.totalDiscovered}</span>
                </div>
                <div className="bg-[#181818] border border-[#303030] rounded-xl p-3.5">
                  <span className="text-[10px] font-mono uppercase text-[#858585] block">Mapped</span>
                  <span className="text-xl font-bold font-mono text-emerald-400">{migPreview.summary.mappedCount}</span>
                </div>
                <div className="bg-[#181818] border border-[#303030] rounded-xl p-3.5">
                  <span className="text-[10px] font-mono uppercase text-[#858585] block">Unmapped</span>
                  <span className="text-xl font-bold font-mono text-amber-400">{migPreview.summary.unmappedCount}</span>
                </div>
                <div className="bg-[#181818] border border-[#303030] rounded-xl p-3.5">
                  <span className="text-[10px] font-mono uppercase text-[#858585] block">Duplicates</span>
                  <span className="text-xl font-bold font-mono text-amber-300">{migPreview.summary.potentialDuplicatesCount}</span>
                </div>
                <div className="bg-[#181818] border border-[#303030] rounded-xl p-3.5">
                  <span className="text-[10px] font-mono uppercase text-[#858585] block">Conflicts</span>
                  <span className="text-xl font-bold font-mono text-[#FF493B]">{migPreview.summary.conflictsCount}</span>
                </div>
              </div>

              {Object.values(migSelectedPins).some(Boolean) && (
                <div className="bg-[#181818] border border-[#F03B2E]/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <span className="font-mono text-[#F5F5F5]">
                    <strong>{Object.values(migSelectedPins).filter(Boolean).length}</strong> user(s) selected for bulk mapping
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={migBusy}
                      onClick={() => handleBulkMapMigration(true)}
                      className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#202020] hover:bg-[#303030] border border-[#303030] text-[#F5F5F5] font-bold uppercase cursor-pointer"
                    >
                      Dry Run Validation
                    </button>
                    <button
                      type="button"
                      disabled={migBusy}
                      onClick={() => handleBulkMapMigration(false)}
                      className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#F03B2E] hover:bg-[#FF493B] text-white font-bold uppercase cursor-pointer"
                    >
                      Confirm Bulk Mapping
                    </button>
                  </div>
                </div>
              )}

              {migBulkReport && (
                <div className="bg-[#181818] border border-[#303030] rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#F03B2E] uppercase">
                      {migBulkReport.dryRun ? 'Dry-Run Reconciliation Report' : 'Bulk Migration Report'}
                    </span>
                    <button type="button" onClick={() => setMigBulkReport(null)} className="text-[#858585] hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[#B8B8B8]">
                    Succeeded: <strong className="text-emerald-400">{migBulkReport.succeededCount}</strong> • Failed:{' '}
                    <strong className="text-[#FF493B]">{migBulkReport.failedCount}</strong> • Active Mappings:{' '}
                    <strong className="font-mono">{migBulkReport.beforeCounts.activeMappings} → {migBulkReport.afterCounts.activeMappings}</strong>
                  </p>
                  {migBulkReport.results.some((r) => r.status === 'FAILED') && (
                    <div className="space-y-1 pt-1">
                      {migBulkReport.results.filter((r) => r.status === 'FAILED').map((r, i) => (
                        <div key={i} className="text-[#FF6A5E] font-mono text-[11px]">
                          PIN {r.biometricUserId}: {r.error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="bg-[#181818] border border-[#303030] rounded-2xl overflow-hidden">
                {migPreview.users.length === 0 ? (
                  <div className="py-10 text-center text-xs text-[#858585] italic">
                    No discovered device users match the current filter. When the X2008 pushes OPERLOG user records, they appear here automatically.
                  </div>
                ) : (
                  <div className="divide-y divide-[#252525]">
                    {migPreview.users.map((u) => (
                      <div key={u.biometricUserId} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
                        <div className="flex items-start gap-3">
                          {u.mappingStatus === 'UNMAPPED' && (
                            <input
                              type="checkbox"
                              checked={Boolean(migSelectedPins[u.biometricUserId])}
                              onChange={(e) =>
                                setMigSelectedPins((prev) => ({ ...prev, [u.biometricUserId]: e.target.checked }))
                              }
                              className="mt-1"
                            />
                          )}
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold text-[#F03B2E]">PIN: {u.biometricUserId}</span>
                              <span className="font-bold text-[#F5F5F5]">{u.deviceUserName || '(No Device Name)'}</span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                  u.mappingStatus === 'MAPPED'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                }`}
                              >
                                {u.mappingStatus}
                              </span>
                              {u.mappingStatus === 'UNMAPPED' && (
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                                    u.confidence === 'HIGH'
                                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                      : u.confidence === 'POSSIBLE'
                                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                        : 'bg-[#202020] text-[#858585] border-[#303030]'
                                  }`}
                                >
                                  Match: {u.confidence}
                                </span>
                              )}
                              {u.hasConflict && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F03B2E]/15 text-[#FF493B] border border-[#F03B2E]/35">
                                  CONFLICT: {u.conflictReason}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#B8B8B8]">
                              {u.branchName} • {u.deviceName}
                              {u.mappedClient && (
                                <> → Mapped to <strong className="text-[#F5F5F5]">{u.mappedClient.clientId} {u.mappedClient.name}</strong></>
                              )}
                              {!u.mappedClient && u.suggestedClient && (
                                <> • Suggested: <strong className="text-emerald-300">{u.suggestedClient.clientId} {u.suggestedClient.name}</strong></>
                              )}
                            </p>
                          </div>
                        </div>

                        {u.mappingStatus === 'UNMAPPED' && (
                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={migAssignMap[u.biometricUserId] || ''}
                              onChange={(e) => setMigAssignMap({ ...migAssignMap, [u.biometricUserId]: e.target.value })}
                              className="min-h-[38px] max-w-[260px] bg-[#111111] border border-[#303030] rounded-lg px-2.5 text-xs text-[#F5F5F5]"
                            >
                              <option value="">Select Member to Confirm</option>
                              {(u.candidates?.length > 0 ? u.candidates : []).map((cand) => (
                                <option key={`cand-${cand.clientProfileId}`} value={cand.clientProfileId}>
                                  [Suggested] {cand.clientId || '—'} — {cand.name}
                                </option>
                              ))}
                              {clientsList.map((c) => (
                                <option key={c.profileId || c.id} value={c.profileId || ''} disabled={!c.profileId}>
                                  {c.clientId || '—'} — {c.name} {!c.profileId ? '[No ClientProfile]' : ''}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleMapMigrationRow(u.biometricUserId)}
                              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#F03B2E] hover:bg-[#FF493B] text-white text-[11px] font-bold uppercase cursor-pointer"
                            >
                              Confirm Map
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ENROLLMENT DETAILS MODAL ── */}
      {(selectedEnrollmentDetail || enrDetailLoading) && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelectedEnrollmentDetail(null)}
        >
          <div
            className="bg-[#181818] border-t sm:border border-[#303030] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#252525] flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#F03B2E] font-bold block">ENROLLMENT REQUEST DETAILS</span>
                <h3 className="mm-page-title text-lg">
                  {selectedEnrollmentDetail?.enrollment?.clientProfileId?.name || 'Loading...'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEnrollmentDetail(null)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-[#202020] text-[#F5F5F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {enrDetailLoading || !selectedEnrollmentDetail?.enrollment ? (
              <div className="p-8 text-center text-xs text-[#B8B8B8]">Loading enrollment details...</div>
            ) : (() => {
              const e = selectedEnrollmentDetail.enrollment;
              const mem = selectedEnrollmentDetail.latestMembership;
              return (
                <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#111111] border border-[#252525] rounded-xl p-4">
                    <div>
                      <span className="text-[10px] text-[#858585] block">Client ID</span>
                      <span className="font-mono font-bold text-[#F03B2E]">{e.clientProfileId?.clientId || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#858585] block">Branch</span>
                      <span className="font-bold text-[#F5F5F5]">{e.branchId?.city || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#858585] block">Request ID</span>
                      <span className="font-mono text-[#B8B8B8]">{String(e._id).slice(-8)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#858585] block">Consent Status</span>
                      <span className="font-mono font-bold text-[#F5F5F5]">{e.consentStatus}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#858585] block">Capture Status</span>
                      <span className="font-mono text-[#F5F5F5]">{e.mobileCaptureStatus}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#858585] block">Identity Verification</span>
                      <span className="font-mono text-[#F5F5F5]">{e.identityVerificationStatus}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#858585] block">Admin Approval</span>
                      <span className="font-mono text-[#F5F5F5]">{e.adminApprovalStatus}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#858585] block">Device Enrollment</span>
                      <span className="font-mono text-[#F5F5F5]">{e.deviceEnrollmentStatus}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#858585] block">Face / Finger</span>
                      <span className="font-mono text-[#F5F5F5]">{e.faceEnrollmentStatus} / {e.fingerprintEnrollmentStatus}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#858585] block">Assigned Device</span>
                      <span className="text-[#F5F5F5]">{e.assignedDeviceId ? `${e.assignedDeviceId.model} (${e.assignedDeviceId.deviceName})` : '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#858585] block">Biometric User ID</span>
                      <span className="font-mono font-bold text-[#F5F5F5]">{e.biometricUserId || 'Not assigned'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#858585] block">Membership</span>
                      <span className="font-mono text-[#F5F5F5]">{mem ? `${mem.planName} (${mem.status})` : 'None'}</span>
                    </div>
                  </div>

                  {e.captureQuality && e.captureQuality.frameCount > 0 && (
                    <div className="bg-[#111111] border border-[#252525] rounded-xl p-3.5 flex flex-wrap gap-4 font-mono">
                      <span>Brightness: <strong>{e.captureQuality.brightnessScore}</strong></span>
                      <span>Sharpness: <strong>{e.captureQuality.sharpnessScore}</strong></span>
                      <span>Frames: <strong>{e.captureQuality.frameCount}</strong></span>
                      <span>Liveness: <strong>{e.captureQuality.livenessPassed ? 'Passed' : 'Failed'}</strong></span>
                    </div>
                  )}

                  {e.failureReason && (
                    <div className="p-3 rounded-xl bg-[#F03B2E]/10 border border-[#F03B2E]/35 text-[#FF6A5E]">
                      <strong>Failure / Rejection Reason:</strong> {e.failureReason}
                    </div>
                  )}

                  {(e.biometricUserId || e.deviceUserSyncStatus !== 'NOT_STARTED') && (
                    <div className="p-4 rounded-xl bg-[#111111] border border-[#252525] space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase text-[#858585]">Device User Sync</span>
                        <span className={`font-mono text-[11px] font-bold uppercase ${
                          e.deviceUserSyncStatus === 'VERIFIED' || e.deviceUserSyncStatus === 'ACKNOWLEDGED' || e.status === 'DEVICE_USER_READY'
                            ? 'text-emerald-400'
                            : e.deviceUserSyncStatus === 'FAILED'
                            ? 'text-[#FF6A5E]'
                            : 'text-amber-400'
                        }`}>
                          {e.deviceUserSyncStatus === 'VERIFIED' || e.deviceUserSyncStatus === 'ACKNOWLEDGED' || e.status === 'DEVICE_USER_READY'
                            ? 'READY'
                            : e.deviceUserSyncStatus === 'FAILED'
                            ? 'SYNC FAILED'
                            : 'Syncing...'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-[#B8B8B8]">
                        <div>Client: <strong className="font-mono text-[#F5F5F5]">{e.clientProfileId?.clientId || '—'}</strong></div>
                        <div>Biometric ID: <strong className="font-mono text-[#F5F5F5]">{e.biometricUserId || '—'}</strong></div>
                        <div>Device: <strong className="text-[#F5F5F5]">{e.assignedDeviceId?.deviceName || '—'}</strong></div>
                        <div>Enrollment: <strong className="font-mono text-[#F5F5F5]">{e.adminApprovalStatus || 'PENDING'}</strong></div>
                        <div>Face Enrollment: <strong className="font-mono text-[#F5F5F5]">{e.faceEnrollmentStatus || 'PENDING'}</strong></div>
                      </div>
                      {(e.status === 'DEVICE_USER_READY' || e.deviceUserSyncStatus === 'VERIFIED' || e.deviceUserSyncStatus === 'ACKNOWLEDGED') && (
                        <p className="text-[11px] text-emerald-300 font-semibold">
                          DEVICE USER READY — The client can now visit the biometric machine and enroll their face.
                        </p>
                      )}
                      {e.deviceUserSyncStatus === 'FAILED' && e.deviceUserSyncError && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                          <span className="text-[11px] text-[#FF6A5E]">Reason: {e.deviceUserSyncError}</span>
                          {e.status !== 'ENROLLED' && (
                            <button
                              type="button"
                              onClick={() => handleRetryEnrollmentSync(e)}
                              className="px-3 py-1.5 rounded-lg bg-[#202020] hover:bg-[#303030] border border-[#303030] text-[#F5F5F5] text-[11px] font-bold uppercase cursor-pointer shrink-0"
                            >
                              Retry Sync
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase text-[#858585] block">Enrollment History</span>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto">
                      {(e.history || []).map((h, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-[#111111] border border-[#252525] flex justify-between gap-2">
                          <div>
                            <span className="font-mono font-bold text-[#F03B2E]">{h.action}</span>
                            {h.note && <p className="text-[#B8B8B8] mt-0.5">{h.note}</p>}
                          </div>
                          <span className="font-mono text-[10px] text-[#858585] shrink-0">
                            {new Date(h.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#252525] flex flex-wrap justify-end gap-2">
                    {['CAPTURE_SUBMITTED', 'PENDING_REVIEW'].includes(e.status) && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApproveEnrollment(e)}
                          className="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold uppercase cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectEnrollment(e)}
                          className="min-h-[40px] px-4 py-2 rounded-xl bg-[#F03B2E]/20 text-[#FF493B] border border-[#F03B2E]/40 font-bold uppercase cursor-pointer"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {e.status !== 'ENROLLED' && (
                      <button
                        type="button"
                        onClick={() => {
                          setManualForm({
                            enrollmentId: e._id,
                            clientProfileId: e.clientProfileId?._id || '',
                            deviceId: e.assignedDeviceId?._id || devices[0]?._id || '',
                            biometricUserId: e.biometricUserId || '',
                            captureType: 'FACE',
                            verifiedByDevice: false,
                          });
                          setSelectedEnrollmentDetail(null);
                          setActiveTab('manual');
                        }}
                        className="min-h-[40px] px-4 py-2 rounded-xl bg-[#F03B2E] text-white font-bold uppercase cursor-pointer"
                      >
                        {['FAILED', 'REJECTED'].includes(e.status) ? 'Retry / Complete on Device' : 'Complete Manual Enrollment'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── DEVICE DETAIL DRAWER ── */}
      {selectedDeviceId && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center sm:justify-end"
          onClick={() => {
            setSelectedDeviceId(null);
            setDeviceDetail(null);
          }}
        >
          <div
            className="w-full sm:max-w-2xl bg-[#111111] border-t sm:border-l border-[#303030] rounded-t-2xl sm:rounded-none h-[92dvh] sm:h-full flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#303030] flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase text-[#F03B2E] font-bold block">
                  {deviceDetail?.device?.branchId?.city || 'BRANCH'} — BIOMETRIC DEVICE
                </span>
                <h3 className="font-display text-lg sm:text-xl font-bold uppercase text-[#F5F5F5] truncate">
                  {deviceDetail?.device?.deviceName || 'Loading...'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedDeviceId(null);
                  setDeviceDetail(null);
                }}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#202020] border border-[#303030] text-[#F5F5F5] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading || !deviceDetail ? (
              <div className="p-8 text-center text-xs text-[#B8B8B8]">Loading device telemetry...</div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Drawer Tabs */}
                <div className="flex flex-wrap gap-2 border-b border-[#252525] pb-3">
                  {[
                    { key: 'overview', label: 'Overview & Health' },
                    { key: 'mappings', label: `User Mappings (${deviceDetail.mappings.length})` },
                    { key: 'commands', label: 'Commands' },
                    { key: 'logs', label: `Connection Logs (${deviceDetail.logs.length})` },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => {
                        setDetailTab(t.key);
                        if (t.key === 'commands') fetchDeviceCommands(deviceDetail.device._id);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase cursor-pointer ${
                        detailTab === t.key ? 'bg-[#F03B2E] text-white' : 'bg-[#181818] text-[#B8B8B8]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {detailTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="bg-[#181818] border border-[#303030] rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase text-[#F03B2E] font-bold">Device Health</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getStatusPill(deviceDetail.device.effectiveStatus).cls}`}>
                          {getStatusPill(deviceDetail.device.effectiveStatus).label}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] text-[#858585] block">Manufacturer / Model</span>
                          <span className="font-bold text-[#F5F5F5]">{deviceDetail.device.manufacturer} {deviceDetail.device.model}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#858585] block">Serial Number</span>
                          <span className="font-mono font-bold text-[#F5F5F5]">{deviceDetail.device.serialNumber}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#858585] block">Device ID / MAC</span>
                          <span className="font-mono text-[#F5F5F5]">#{deviceDetail.device.deviceId} • {deviceDetail.device.macAddress || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#858585] block">Firmware</span>
                          <span className="font-mono text-[#F5F5F5]">{deviceDetail.device.firmwareVersion || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#858585] block">Protocol / ADMS Port</span>
                          <span className="font-mono text-[#F5F5F5]">{deviceDetail.device.communicationProtocol} : {deviceDetail.device.admsServerPort}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#858585] block">Local IP / TCP Port</span>
                          <span className="font-mono text-[#F5F5F5]">{deviceDetail.device.localIp || '—'} : {deviceDetail.device.tcpPort}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#858585] block">Last Seen</span>
                          <span className="font-mono text-[#F5F5F5]">{formatLastSeen(deviceDetail.device.lastSeenAt, deviceDetail.device.lastSeenSecondsAgo)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#858585] block">Last Sync</span>
                          <span className="font-mono text-[#F5F5F5]">
                            {deviceDetail.device.lastSyncAt ? new Date(deviceDetail.device.lastSyncAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Never'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#181818] border border-[#303030] rounded-xl p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-[#858585] block">Users</span>
                        <span className="font-mono font-bold text-[#F5F5F5]">{deviceDetail.device.userCount} / {deviceDetail.device.userCapacity}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#858585] block">Face</span>
                        <span className="font-mono font-bold text-[#F5F5F5]">{deviceDetail.device.faceCount} / {deviceDetail.device.faceCapacity}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#858585] block">Fingerprint</span>
                        <span className="font-mono font-bold text-[#F5F5F5]">{deviceDetail.device.fingerprintCount} / {deviceDetail.device.fingerprintCapacity}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#858585] block">Today</span>
                        <span className="font-mono font-bold text-[#F03B2E]">{deviceDetail.device.attendanceToday}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#858585] block">This Month</span>
                        <span className="font-mono font-bold text-[#F5F5F5]">{deviceDetail.device.attendanceThisMonth}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleTestConnection(deviceDetail.device._id)}
                        className="min-h-[42px] px-4 py-2 rounded-xl bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase text-[#F5F5F5] cursor-pointer"
                      >
                        Test Connection
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSyncDevice(deviceDetail.device._id)}
                        className="min-h-[42px] px-4 py-2 rounded-xl bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase text-[#F5F5F5] cursor-pointer"
                      >
                        Sync Device
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(deviceDetail.device)}
                        className="min-h-[42px] px-4 py-2 rounded-xl bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase text-[#F5F5F5] cursor-pointer"
                      >
                        Edit Device
                      </button>
                      <button
                        type="button"
                        onClick={() => requestToggleDevice(deviceDetail.device)}
                        className={`min-h-[42px] px-4 py-2 rounded-xl border text-xs font-bold uppercase cursor-pointer ${
                          deviceDetail.device.isActive
                            ? 'bg-[#F03B2E]/10 text-[#FF493B] border-[#F03B2E]/35'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {deviceDetail.device.isActive ? 'Disable Device' : 'Enable Device'}
                      </button>
                    </div>
                  </div>
                )}

                {detailTab === 'mappings' && (
                  <div className="space-y-4">
                    <form onSubmit={handleMapUser} className="bg-[#181818] border border-[#303030] rounded-xl p-4 space-y-3">
                      <span className="text-xs font-mono uppercase text-[#F03B2E] font-bold block">Map Biometric User ID</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <input
                          type="text"
                          required
                          value={mapBioId}
                          onChange={(e) => setMapBioId(e.target.value)}
                          placeholder="Device User ID (e.g. 101)"
                          className="min-h-[44px] px-3 py-2 bg-[#111111] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] font-mono"
                        />
                        <select
                          required
                          value={mapClientProfileId}
                          onChange={(e) => setMapClientProfileId(e.target.value)}
                          className="min-h-[44px] px-3 py-2 bg-[#111111] border border-[#303030] rounded-xl text-xs text-[#F5F5F5]"
                        >
                          <option value="">Select Member</option>
                          {clientsList.map((c) => (
                            <option key={c.profileId || c.id} value={c.profileId || ''} disabled={!c.profileId}>
                              {c.clientId || '—'} — {c.name} {!c.profileId ? '[No ClientProfile]' : ''}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          disabled={mappingBusy}
                          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F03B2E] text-white text-xs font-bold uppercase cursor-pointer"
                        >
                          {mappingBusy ? 'Mapping...' : 'Map User'}
                        </button>
                      </div>
                    </form>

                    <div className="space-y-2">
                      {deviceDetail.mappings.length === 0 ? (
                        <p className="text-xs text-[#858585] italic">No biometric user mappings yet.</p>
                      ) : (
                        deviceDetail.mappings.map((m) => (
                          <div key={m._id} className="p-3 rounded-xl bg-[#181818] border border-[#303030] flex items-center justify-between gap-2 text-xs">
                            <div>
                              <span className="font-mono font-bold text-[#F03B2E]">Bio ID: {m.biometricUserId}</span>
                              <span className="mx-2 text-[#858585]">→</span>
                              <span className="font-bold text-[#F5F5F5]">
                                {m.clientProfileId?.clientId || ''} {m.clientProfileId?.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => requestUnmapUser(m)}
                              className="px-2.5 py-1 rounded-lg bg-[#202020] hover:bg-[#F03B2E]/20 text-[#FF493B] text-[11px] font-bold uppercase cursor-pointer"
                            >
                              Unmap
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {detailTab === 'commands' && (
                  <div className="space-y-4 text-xs">
                    <div className="bg-[#181818] border border-[#303030] rounded-xl p-4 space-y-3">
                      <span className="font-mono uppercase text-[#F03B2E] font-bold block">
                        Safe Read-Only ADMS Commands
                      </span>
                      <p className="text-[#B8B8B8] text-[11px]">
                        Only allowlisted read-only commands are permitted. Destructive commands (CLEAR, DELETE, RESET) are permanently blocked.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { type: 'INFO', label: 'Query Device INFO' },
                          { type: 'CHECK', label: 'Trigger CHECK' },
                          { type: 'DATA_QUERY_USERINFO', label: 'Query USERINFO' },
                        ].map((c) => (
                          <button
                            key={c.type}
                            type="button"
                            disabled={queueCmdBusy}
                            onClick={() => handleQueueCommand(c.type)}
                            className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#202020] hover:bg-[#303030] border border-[#303030] text-[#F5F5F5] font-bold uppercase cursor-pointer disabled:opacity-50"
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-[#181818] border border-[#303030]">
                        <span className="text-[10px] text-[#858585] block">Pending</span>
                        <span className="font-mono font-bold text-amber-400">{deviceCommandsData.counts.pending}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#181818] border border-[#303030]">
                        <span className="text-[10px] text-[#858585] block">Sent</span>
                        <span className="font-mono font-bold text-sky-400">{deviceCommandsData.counts.sent}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#181818] border border-[#303030]">
                        <span className="text-[10px] text-[#858585] block">Completed</span>
                        <span className="font-mono font-bold text-emerald-400">{deviceCommandsData.counts.completed}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#181818] border border-[#303030]">
                        <span className="text-[10px] text-[#858585] block">Failed</span>
                        <span className="font-mono font-bold text-[#FF493B]">{deviceCommandsData.counts.failed}</span>
                      </div>
                    </div>

                    {commandsLoading ? (
                      <p className="text-[#858585] font-mono">Loading command queue...</p>
                    ) : deviceCommandsData.commands.length === 0 ? (
                      <p className="text-[#858585] italic">No ADMS commands queued yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {deviceCommandsData.commands.map((cmd) => (
                          <div key={cmd._id} className="p-3 rounded-xl bg-[#181818] border border-[#303030] flex items-center justify-between gap-2">
                            <div>
                              <span className="font-mono font-bold text-[#F5F5F5]">{cmd.commandType}</span>
                              <span className="mx-2 font-mono text-[10px] text-[#858585]">ID: {cmd.commandId}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#202020] text-amber-300 border border-[#303030]">
                                {cmd.status}
                              </span>
                              {cmd.error && <p className="text-[#FF6A5E] text-[11px] mt-1">{cmd.error}</p>}
                            </div>
                            {['PENDING', 'SENT'].includes(cmd.status) && (
                              <button
                                type="button"
                                onClick={() => handleCancelCommand(cmd._id)}
                                className="px-2.5 py-1 rounded bg-[#202020] text-[#FF493B] text-[11px] font-bold uppercase cursor-pointer"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {detailTab === 'logs' && (
                  <div className="space-y-2">
                    {deviceDetail.logs.length === 0 ? (
                      <p className="text-xs text-[#858585] italic">No connection or audit logs recorded yet.</p>
                    ) : (
                      deviceDetail.logs.map((l) => (
                        <div key={l._id} className="p-3 rounded-xl bg-[#181818] border border-[#303030] text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-[#F03B2E]">{l.category} {l.action ? `• ${l.action}` : ''}</span>
                            <span className="font-mono text-[10px] text-[#858585]">
                              {new Date(l.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                            </span>
                          </div>
                          <p className="text-[#F5F5F5]">{l.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ADD / EDIT DEVICE MODAL ── */}
      {isDeviceModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIsDeviceModalOpen(false)}
        >
          <div
            className="bg-[#181818] border-t sm:border border-[#303030] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92dvh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#252525] flex items-center justify-between">
              <h3 className="mm-page-title text-lg">{editingDevice ? 'EDIT BIOMETRIC DEVICE' : 'ADD BIOMETRIC DEVICE'}</h3>
              <button type="button" onClick={() => setIsDeviceModalOpen(false)} className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-[#202020] text-[#F5F5F5]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDevice} className="flex-1 overflow-y-auto p-5 space-y-3 text-xs">
              {deviceModalError && (
                <div className="p-3 rounded-lg bg-[#F03B2E]/10 border border-[#F03B2E] text-[#F5F5F5]">{deviceModalError}</div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Branch *</label>
                  <select
                    required
                    value={deviceForm.branchId}
                    onChange={(e) => setDeviceForm({ ...deviceForm, branchId: e.target.value })}
                    className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 text-[#F5F5F5]"
                  >
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>{b.city}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Device Name *</label>
                  <input
                    type="text"
                    required
                    value={deviceForm.deviceName}
                    onChange={(e) => setDeviceForm({ ...deviceForm, deviceName: e.target.value })}
                    placeholder="e.g. Kovilpatti Main Entrance"
                    className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 text-[#F5F5F5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Manufacturer</label>
                  <input type="text" value={deviceForm.manufacturer} onChange={(e) => setDeviceForm({ ...deviceForm, manufacturer: e.target.value })} className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 text-[#F5F5F5]" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Model</label>
                  <input type="text" value={deviceForm.model} onChange={(e) => setDeviceForm({ ...deviceForm, model: e.target.value })} className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 text-[#F5F5F5]" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Device ID *</label>
                  <input type="number" min="1" required value={deviceForm.deviceId} onChange={(e) => setDeviceForm({ ...deviceForm, deviceId: e.target.value })} className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 text-[#F5F5F5] font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Serial Number *</label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingDevice)}
                    value={deviceForm.serialNumber}
                    onChange={(e) => setDeviceForm({ ...deviceForm, serialNumber: e.target.value })}
                    placeholder="TDDB250600919"
                    className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 text-[#F5F5F5] font-mono disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">MAC Address</label>
                  <input type="text" value={deviceForm.macAddress} onChange={(e) => setDeviceForm({ ...deviceForm, macAddress: e.target.value })} placeholder="00:17:51:10:4b:13" className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 text-[#F5F5F5] font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Protocol</label>
                  <select value={deviceForm.communicationProtocol} onChange={(e) => setDeviceForm({ ...deviceForm, communicationProtocol: e.target.value })} className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 text-[#F5F5F5]">
                    <option value="ADMS">ADMS</option>
                    <option value="TCP">TCP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">ADMS Port</label>
                  <input type="number" value={deviceForm.admsServerPort} onChange={(e) => setDeviceForm({ ...deviceForm, admsServerPort: e.target.value })} className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 text-[#F5F5F5] font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Local IP</label>
                  <input type="text" value={deviceForm.localIp} onChange={(e) => setDeviceForm({ ...deviceForm, localIp: e.target.value })} placeholder="192.168.0.203" className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 text-[#F5F5F5] font-mono" />
                </div>
              </div>

              <div className="pt-3 border-t border-[#252525] flex justify-end gap-2">
                <button type="button" onClick={() => setIsDeviceModalOpen(false)} className="min-h-[44px] px-4 py-2 rounded-xl bg-[#202020] text-[#B8B8B8] font-bold uppercase cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={savingDevice} className="min-h-[44px] px-5 py-2 rounded-xl bg-[#F03B2E] text-white font-bold uppercase cursor-pointer">
                  {savingDevice ? 'Saving...' : editingDevice ? 'Save Device' : 'Register Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CONFIRM DIALOG ── */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConfirmDialog(null)}>
          <div className="bg-[#181818] border border-[#303030] rounded-2xl max-w-sm w-full p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h4 className="mm-page-title text-lg">{confirmDialog.title}</h4>
            <p className="text-xs text-[#B8B8B8]">{confirmDialog.description}</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmDialog(null)} className="min-h-[40px] px-4 py-2 rounded-xl bg-[#202020] text-xs font-bold uppercase text-[#B8B8B8] cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={confirmDialog.onConfirm} className="min-h-[40px] px-4 py-2 rounded-xl bg-[#F03B2E] text-xs font-bold uppercase text-white cursor-pointer">
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
