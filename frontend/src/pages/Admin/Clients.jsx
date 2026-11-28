import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  AlertTriangle,
  UserCheck,
  Building,
  CreditCard,
  CalendarCheck,
  Receipt,
  KeyRound,
  Edit,
  Eye,
  X,
  Mail,
  Phone,
  Calendar,
  Dumbbell,
  SlidersHorizontal,
  PauseCircle,
  CheckCircle2,
  UserPlus,
  RotateCcw,
  Wallet,
  ShieldCheck,
  UserCog,
  Fingerprint,
} from 'lucide-react';
import adminService from '../../services/adminService.js';
import biometricService from '../../services/biometricService.js';
import TrainerAvatar from '../../components/UI/TrainerAvatar.jsx';
import { useAdmin } from '../../components/Admin/AdminLayout.jsx';

export default function Clients() {
  const { branches, selectedBranch } = useAdmin();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState(selectedBranch);
  const [membershipStatus, setMembershipStatus] = useState('ALL');
  const [accountStatus, setAccountStatus] = useState('ALL');
  const [trainerFilter, setTrainerFilter] = useState('ALL');

  // Modals & Bottom Sheets
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [clientDetailData, setClientDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTargetSection, setDetailTargetSection] = useState(null);

  const [actionSheetClient, setActionSheetClient] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [busyClientId, setBusyClientId] = useState(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addError, setAddError] = useState(null);
  const [addDuplicateClient, setAddDuplicateClient] = useState(null);
  const [newlyCreatedClient, setNewlyCreatedClient] = useState(null);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTargetId, setEditTargetId] = useState(null);
  const [editError, setEditError] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordTargetClient, setPasswordTargetClient] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTargetClient, setAssignTargetClient] = useState(null);
  const [assignError, setAssignError] = useState(null);
  const [assignForm, setAssignForm] = useState({
    planId: '',
    startDate: new Date().toISOString().slice(0, 10),
    amount: '',
    paymentMethod: 'CASH',
    paymentStatus: 'FULL',
    referenceNumber: '',
  });
  const [assignLoading, setAssignLoading] = useState(false);

  const [isTrainerModalOpen, setIsTrainerModalOpen] = useState(false);
  const [trainerModalClient, setTrainerModalClient] = useState(null);
  const [selectedTrainerId, setSelectedTrainerId] = useState('');
  const [trainerAssignError, setTrainerAssignError] = useState(null);
  const [assigningTrainer, setAssigningTrainer] = useState(false);

  const [trainersList, setTrainersList] = useState([]);
  const [plans, setPlans] = useState([]);

  // Record Payment modal state
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [recordPaymentInvoice, setRecordPaymentInvoice] = useState(null);
  const [recordPaymentForm, setRecordPaymentForm] = useState({
    amount: '',
    paymentMethod: 'CASH',
    paymentDate: new Date().toISOString().slice(0, 10),
    referenceNumber: '',
    notes: '',
  });
  const [recordPaymentLoading, setRecordPaymentLoading] = useState(false);
  const [recordPaymentError, setRecordPaymentError] = useState(null);

  // Client invoices state
  const [clientInvoices, setClientInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Create Login Access state
  const [creatingLoginAccess, setCreatingLoginAccess] = useState(false);
  const [loginAccessResult, setLoginAccessResult] = useState(null);

  // Physical Biometric Enrollment Modal state
  const [isBioEnrollModalOpen, setIsBioEnrollModalOpen] = useState(false);
  const [bioEnrollDevices, setBioEnrollDevices] = useState([]);
  const [bioEnrollForm, setBioEnrollForm] = useState({
    branchId: '',
    deviceId: '',
    biometricUserId: '',
    captureType: 'FACE',
  });
  const [bioEnrollRequest, setBioEnrollRequest] = useState(null);
  const [bioEnrollBusy, setBioEnrollBusy] = useState(false);
  const [bioEnrollError, setBioEnrollError] = useState(null);

  // Section scroll refs inside Dossier
  const membershipSectionRef = useRef(null);
  const attendanceSectionRef = useRef(null);
  const paymentSectionRef = useRef(null);

  // Form states
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    phone: '',
    gender: '',
    age: '',
    dateOfBirth: '',
    address: '',
    emergencyContact: '',
    registrationDate: new Date().toISOString().slice(0, 10),
    notes: '',
    createLoginAccess: false,
    branchId: '',
    fitnessGoal: 'General Fitness',
    experienceLevel: 'Beginner',
    trainerId: '',
    assignMembershipNow: true,
    planId: '',
    startDate: new Date().toISOString().slice(0, 10),
    durationDays: 30,
    amount: '',
    paymentMethod: 'CASH',
    paymentStatus: 'PAID',
    paidAmount: '',
    allowAccessWithBalance: true,
  });

  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    gender: '',
    age: '',
    dateOfBirth: '',
    address: '',
    emergencyContact: '',
    notes: '',
    branchId: '',
    fitnessGoal: '',
    experienceLevel: '',
  });

  const [newPassword, setNewPassword] = useState('');
  const [bioLogsOpen, setBioLogsOpen] = useState(false);
  const [bioLogsLoading, setBioLogsLoading] = useState(false);
  const [bioLogsData, setBioLogsData] = useState(null);
  const [bioLogsError, setBioLogsError] = useState('');
  const [bioActionLoading, setBioActionLoading] = useState(false);

  const activeTrainers = trainersList.filter((t) => t.status === 'ACTIVE');

  useEffect(() => {
    setBranchFilter(selectedBranch);
    setPage(1);
  }, [selectedBranch]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('add') === '1' && branches.length > 0 && !isAddModalOpen) {
      handleOpenAddModal();
      window.history.replaceState({}, '', '/admin/clients');
    }
  }, [branches]);

  const anyOverlayOpen = Boolean(
    selectedClientId ||
      actionSheetClient ||
      confirmDialog ||
      isAddModalOpen ||
      isEditModalOpen ||
      isPasswordModalOpen ||
      isAssignModalOpen ||
      isTrainerModalOpen ||
      isRecordPaymentOpen
  );

  // Lock background scroll whenever any modal or sheet is open
  useEffect(() => {
    if (!anyOverlayOpen) return undefined;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [anyOverlayOpen]);

  // Escape key closes topmost overlay
  useEffect(() => {
    if (!anyOverlayOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (confirmDialog) setConfirmDialog(null);
      else if (isPasswordModalOpen) {
        setIsPasswordModalOpen(false);
        setPasswordError(null);
      } else if (isAssignModalOpen) {
        setIsAssignModalOpen(false);
        setAssignError(null);
      } else if (isTrainerModalOpen) {
        setIsTrainerModalOpen(false);
        setTrainerAssignError(null);
      } else if (isEditModalOpen) {
        setIsEditModalOpen(false);
        setEditError(null);
      } else if (isAddModalOpen) {
        setIsAddModalOpen(false);
        setAddError(null);
      } else if (actionSheetClient) {
        setActionSheetClient(null);
      } else if (selectedClientId) {
        setSelectedClientId(null);
        setClientDetailData(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    anyOverlayOpen,
    confirmDialog,
    isPasswordModalOpen,
    isAssignModalOpen,
    isTrainerModalOpen,
    isEditModalOpen,
    isAddModalOpen,
    actionSheetClient,
    selectedClientId,
  ]);

  const showFeedback = (type, message) => {
    setActionFeedback({ type, message });
    setTimeout(() => {
      setActionFeedback((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getClients({
        page,
        limit: pageSize,
        search: appliedSearch,
        branchId: branchFilter,
        membershipStatus,
        accountStatus,
        trainerId: trainerFilter,
      });
      setClients(res.clients || []);
      setTotalPages(Math.max(1, res.totalPages || 1));
      setTotalCount(res.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, appliedSearch, branchFilter, membershipStatus, accountStatus, trainerFilter]);

  const fetchTrainersAndPlans = useCallback(async () => {
    try {
      const [trRes, plansRes] = await Promise.all([
        adminService.getTrainers(),
        adminService.getMembershipPlans().catch(() => ({ plans: [] })),
      ]);
      if (trRes.trainers) setTrainersList(trRes.trainers);
      if (plansRes.plans) setPlans(plansRes.plans);
    } catch (err) {
      console.error('Failed to load trainers or plans:', err);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    fetchTrainersAndPlans();
  }, [fetchTrainersAndPlans]);

  // Scroll to requested section inside Dossier once loaded
  useEffect(() => {
    if (!clientDetailData || !detailTargetSection) return;
    const refMap = {
      membership: membershipSectionRef,
      attendance: attendanceSectionRef,
      payments: paymentSectionRef,
    };
    const targetRef = refMap[detailTargetSection];
    if (targetRef?.current) {
      setTimeout(() => {
        targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
    setDetailTargetSection(null);
  }, [clientDetailData, detailTargetSection]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(search.trim());
  };

  const handleClearSearch = () => {
    setSearch('');
    setPage(1);
    setAppliedSearch('');
  };

  const handleResetFilters = () => {
    setSearch('');
    setAppliedSearch('');
    setBranchFilter('ALL');
    setMembershipStatus('ALL');
    setAccountStatus('ALL');
    setTrainerFilter('ALL');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    appliedSearch ||
      branchFilter !== 'ALL' ||
      membershipStatus !== 'ALL' ||
      accountStatus !== 'ALL' ||
      trainerFilter !== 'ALL'
  );

  const getBiometricStatusBadge = (status) => {
    switch (status) {
      case 'ENROLLED':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'DEVICE_USER_READY':
        return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      case 'DEVICE_USER_SYNCING':
        return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
      case 'AWAITING_PHYSICAL_ENROLLMENT':
      case 'PENDING':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'SYNC_FAILED':
      case 'DEVICE_OFFLINE':
      case 'REVOKED':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'DISABLED':
        return 'bg-[#202020] text-[#858585] border-[#303030]';
      case 'UNKNOWN':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'NOT_ENROLLED':
      default:
        return 'bg-[#202020] text-[#B8B8B8] border-[#303030]';
    }
  };

  const getBiometricStatusLabel = (status) => {
    switch (status) {
      case 'ENROLLED':
        return 'Enrolled';
      case 'DEVICE_USER_READY':
        return 'Device User Ready';
      case 'DEVICE_USER_SYNCING':
        return 'Syncing to Device';
      case 'AWAITING_PHYSICAL_ENROLLMENT':
        return 'Awaiting Face Enrollment';
      case 'PENDING':
        return 'Admin Approved';
      case 'SYNC_FAILED':
        return 'Failed';
      case 'DEVICE_OFFLINE':
        return 'Device Offline';
      case 'REVOKED':
        return 'Revoked';
      case 'DISABLED':
        return 'Disabled';
      case 'NOT_ENROLLED':
        return 'Not Enrolled';
      default:
        return String(status || 'NOT_ENROLLED').replace(/_/g, ' ');
    }
  };

  const handleToggleBiometricLogs = async () => {
    if (bioLogsOpen) {
      setBioLogsOpen(false);
      return;
    }
    const targetId = clientDetailData?.profile?._id || clientDetailData?.client?.id;
    if (!targetId) return;
    setBioLogsOpen(true);
    if (bioLogsData) return;
    try {
      setBioLogsLoading(true);
      setBioLogsError('');
      const res = await biometricService.getClientLogs(targetId, {
        branchId: selectedBranch !== 'ALL' ? selectedBranch : '',
      });
      setBioLogsData(res);
    } catch (err) {
      setBioLogsError(err.message || 'Failed to load biometric logs.');
    } finally {
      setBioLogsLoading(false);
    }
  };

  const loadBioEnrollDevices = async (branchIdVal) => {
    try {
      const res = await biometricService.getDevices({ branchId: branchIdVal || 'ALL' });
      const activeList = (res.devices || []).filter((d) => d.isActive && d.status !== 'DISABLED');
      setBioEnrollDevices(activeList);
      setBioEnrollForm((prev) => ({
        ...prev,
        deviceId: activeList.some((d) => d._id === prev.deviceId) ? prev.deviceId : (activeList[0]?._id || ''),
      }));
    } catch (err) {
      setBioEnrollDevices([]);
    }
  };

  const handleEnrollBiometric = async () => {
    const bio = clientDetailData?.biometricSummary;
    const defaultBranchId =
      clientDetailData?.client?.branch?._id ||
      clientDetailData?.client?.branch ||
      clientDetailData?.profile?.branchId?._id ||
      clientDetailData?.profile?.branchId ||
      branches[0]?._id ||
      '';
    setBioEnrollError(null);
    setBioEnrollRequest(
      bio?.rawEnrollmentStatus === 'AWAITING_PHYSICAL_ENROLLMENT' && bio?.enrollmentId
        ? {
            _id: bio.enrollmentId,
            status: bio.rawEnrollmentStatus,
            biometricUserId: bio.biometricUserId || '',
            assignedDeviceId: bio.deviceId || '',
          }
        : null
    );
    setBioEnrollForm({
      branchId: defaultBranchId,
      deviceId: bio?.deviceId || '',
      biometricUserId: bio?.biometricUserId || '',
      captureType: 'FACE',
    });
    setIsBioEnrollModalOpen(true);
    await loadBioEnrollDevices(defaultBranchId);
  };

  const handleCreatePhysicalEnrollmentRequest = async (e) => {
    e.preventDefault();
    const profileId = clientDetailData?.profile?._id;
    if (!profileId || !bioEnrollForm.deviceId) {
      setBioEnrollError('Please select a branch and registered biometric device.');
      return;
    }
    try {
      setBioEnrollBusy(true);
      setBioEnrollError(null);
      const res = await biometricService.initiatePhysicalEnrollment({
        clientProfileId: profileId,
        deviceId: bioEnrollForm.deviceId,
        biometricUserId: bioEnrollForm.biometricUserId,
      });
      setBioEnrollRequest(res.enrollment);
      setBioEnrollForm((prev) => ({
        ...prev,
        biometricUserId: res.enrollment?.biometricUserId || prev.biometricUserId,
      }));
      showFeedback('success', 'Enrollment request queued (AWAITING_PHYSICAL_ENROLLMENT). Capture face at the X2008 terminal.');
      await handleOpenClientDetails(clientDetailData.client.id);
    } catch (err) {
      setBioEnrollError(err.message || 'Failed to create physical enrollment request.');
    } finally {
      setBioEnrollBusy(false);
    }
  };

  const handleConfirmPhysicalEnrollment = async () => {
    const profileId = clientDetailData?.profile?._id;
    const targetDeviceId = bioEnrollRequest?.assignedDeviceId?._id || bioEnrollRequest?.assignedDeviceId || bioEnrollForm.deviceId;
    const targetBioId = bioEnrollForm.biometricUserId || bioEnrollRequest?.biometricUserId || '';
    if (!profileId || !targetDeviceId) {
      setBioEnrollError('Device and member profile are required to complete enrollment.');
      return;
    }
    try {
      setBioEnrollBusy(true);
      setBioEnrollError(null);
      await biometricService.completeManualEnrollment({
        enrollmentId: bioEnrollRequest?._id || clientDetailData?.biometricSummary?.enrollmentId || null,
        clientProfileId: profileId,
        deviceId: targetDeviceId,
        biometricUserId: targetBioId,
        captureType: bioEnrollForm.captureType || 'FACE',
      });
      setIsBioEnrollModalOpen(false);
      showFeedback('success', 'Biometric ID mapped. Complete physical face enrollment on the device to verify.');
      await handleOpenClientDetails(clientDetailData.client.id);
    } catch (err) {
      setBioEnrollError(err.message || 'Failed to complete physical enrollment.');
    } finally {
      setBioEnrollBusy(false);
    }
  };

  const handleRetryBiometricSync = async () => {
    const deviceId = clientDetailData?.biometricSummary?.deviceId;
    if (!deviceId) return;
    try {
      setBioActionLoading(true);
      await biometricService.syncDevice(deviceId);
      showFeedback('success', 'Device synchronization triggered.');
      await handleOpenClientDetails(clientDetailData.client.id);
    } catch (err) {
      showFeedback('error', err.message || 'Failed to sync biometric device.');
    } finally {
      setBioActionLoading(false);
    }
  };

  const handleDisableBiometric = async () => {
    const mappingId = clientDetailData?.biometricSummary?.mappingId;
    if (!mappingId) return;
    if (!window.confirm('Disable biometric access for this member on the terminal?')) return;
    try {
      setBioActionLoading(true);
      await biometricService.unmapUser(mappingId);
      showFeedback('success', 'Biometric access disabled.');
      await handleOpenClientDetails(clientDetailData.client.id);
    } catch (err) {
      showFeedback('error', err.message || 'Failed to disable biometric access.');
    } finally {
      setBioActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    const exportData = clients.map((c) => ({
      ClientID: c.clientId || '—',
      Name: c.name,
      Email: c.email,
      Phone: c.phone,
      Branch: c.branch?.city || '',
      Status: c.status,
      MembershipPlan: c.membership?.planName || 'None',
      MembershipStatus: c.membership?.status || 'NO_MEMBERSHIP',
      ExpiryDate: c.membership?.expiryDate ? new Date(c.membership.expiryDate).toLocaleDateString() : '—',
      Trainer: c.trainer?.name || 'No Trainer Assigned',
      RegisteredOn: new Date(c.createdAt).toLocaleDateString(),
    }));
    adminService.exportToCSV(exportData, `clients_${Date.now()}.csv`);
  };

  const handleOpenClientDetails = async (id, focusSection = null) => {
    setActionSheetClient(null);
    setDetailTargetSection(focusSection);
    setBioLogsOpen(false);
    setBioLogsData(null);
    setBioLogsError('');
    setSelectedClientId(id);
    setDetailLoading(true);
    setClientInvoices([]);
    setLoginAccessResult(null);
    setInvoicesLoading(true);
    try {
      const [res, invRes] = await Promise.all([
        adminService.getClientDetails(id),
        adminService.getClientInvoices(id).catch(() => ({ invoices: [] })),
      ]);
      setClientDetailData(res);
      setClientInvoices(invRes.invoices || []);
    } catch (err) {
      setSelectedClientId(null);
      showFeedback('error', err.message || 'Failed to fetch client dossier');
    } finally {
      setDetailLoading(false);
      setInvoicesLoading(false);
    }
  };

  const handleOpenEdit = (c) => {
    setActionSheetClient(null);
    setEditError(null);
    const id = c.id || c._id;
    setEditTargetId(id);
    const profile = clientDetailData?.profile;
    setEditForm({
      name: c.name || '',
      phone: c.phone || '',
      email: c.email || '',
      gender: profile?.gender || c.gender || '',
      age: profile?.age ?? c.age ?? '',
      dateOfBirth: profile?.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().slice(0, 10) : '',
      address: profile?.address || c.address || '',
      emergencyContact: profile?.emergencyContact || c.emergencyContact || '',
      notes: profile?.notes || c.notes || '',
      branchId: c.branch?._id || '',
      fitnessGoal: c.fitnessGoal || profile?.fitnessGoal || 'General Fitness',
      experienceLevel: c.experienceLevel || profile?.experienceLevel || 'Beginner',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editTargetId) return;
    setEditError(null);
    try {
      setSavingEdit(true);
      await adminService.updateClient(editTargetId, editForm);
      setIsEditModalOpen(false);
      showFeedback('success', 'Client profile updated successfully.');
      await fetchClients();
      if (selectedClientId === editTargetId) {
        handleOpenClientDetails(editTargetId);
      }
    } catch (err) {
      setEditError(err.message || 'Failed to update client');
    } finally {
      setSavingEdit(false);
    }
  };

  const requestToggleStatus = (client) => {
    setActionSheetClient(null);
    const targetId = client.id || client._id;
    const newSt = client.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const isSuspending = newSt === 'SUSPENDED';

    setConfirmDialog({
      title: isSuspending ? 'Suspend Client Account' : 'Reactivate Client Account',
      confirmLabel: isSuspending ? 'Suspend Account' : 'Reactivate Account',
      tone: isSuspending ? 'red' : 'emerald',
      description: isSuspending
        ? `Suspend ${client.name}? They will not be able to log in or access athlete features until reactivated.`
        : `Restore active Athlete Portal access for ${client.name}?`,
      onConfirm: async () => {
        try {
          setBusyClientId(targetId);
          await adminService.updateClientStatus(targetId, newSt);
          setConfirmDialog(null);
          showFeedback('success', `${client.name} status updated to ${newSt}.`);
          await fetchClients();
          if (selectedClientId === targetId) {
            handleOpenClientDetails(targetId);
          }
        } catch (err) {
          setConfirmDialog(null);
          showFeedback('error', err.message || 'Failed to update status');
        } finally {
          setBusyClientId(null);
        }
      },
    });
  };

  const handleOpenTrainerModal = (client) => {
    setActionSheetClient(null);
    setTrainerAssignError(null);
    setTrainerModalClient(client);
    setSelectedTrainerId(client.trainer?._id || client.trainer?.id || '');
    setIsTrainerModalOpen(true);
  };

  const handleConfirmTrainerModal = async (e) => {
    e.preventDefault();
    const targetId = trainerModalClient?.id || trainerModalClient?._id;
    if (!targetId) return;
    setTrainerAssignError(null);
    try {
      setAssigningTrainer(true);
      await adminService.assignTrainer(targetId, selectedTrainerId);
      setIsTrainerModalOpen(false);
      showFeedback(
        'success',
        selectedTrainerId ? 'Trainer assigned successfully.' : 'Trainer unassigned successfully.'
      );
      await fetchClients();
      if (selectedClientId === targetId) {
        handleOpenClientDetails(targetId);
      }
    } catch (err) {
      setTrainerAssignError(err.message || 'Failed to assign trainer');
    } finally {
      setAssigningTrainer(false);
    }
  };

  const handleAssignTrainerInline = async (trainerId) => {
    if (!selectedClientId) return;
    const chosenTrainer = activeTrainers.find((t) => t.id === trainerId);
    setConfirmDialog({
      title: trainerId ? 'Confirm Trainer Assignment' : 'Remove Trainer Assignment',
      confirmLabel: trainerId ? 'Assign Trainer' : 'Unassign Trainer',
      tone: 'red',
      description: trainerId
        ? `Assign ${chosenTrainer?.name || 'selected trainer'} to ${clientDetailData?.client?.name}?`
        : `Remove assigned trainer for ${clientDetailData?.client?.name}?`,
      onConfirm: async () => {
        try {
          await adminService.assignTrainer(selectedClientId, trainerId);
          setConfirmDialog(null);
          showFeedback(
            'success',
            trainerId ? 'Trainer assigned successfully.' : 'Trainer unassigned successfully.'
          );
          await handleOpenClientDetails(selectedClientId);
          await fetchClients();
        } catch (err) {
          setConfirmDialog(null);
          showFeedback('error', err.message || 'Failed to assign trainer');
        }
      },
    });
  };

  const handleOpenPasswordModal = (client) => {
    setActionSheetClient(null);
    setPasswordError(null);
    setNewPassword('');
    setPasswordTargetClient(client);
    setIsPasswordModalOpen(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    const targetId = passwordTargetClient?.id || passwordTargetClient?._id || selectedClientId;
    if (!targetId) return;
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }
    try {
      setSavingPassword(true);
      await adminService.resetClientPassword(targetId, newPassword);
      setIsPasswordModalOpen(false);
      setNewPassword('');
      showFeedback('success', 'Client password reset successfully.');
    } catch (err) {
      setPasswordError(err.message || 'Failed to reset password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleOpenAddModal = () => {
    setAddError(null);
    setAddDuplicateClient(null);
    setNewlyCreatedClient(null);
    const defaultBranchId = branches[0]?._id || '';
    const branchPlans = getActivePlansForBranch(defaultBranchId);
    const firstPlan = branchPlans[0] || null;
    const firstPrice = firstPlan ? getPlanPricingForBranch(firstPlan, defaultBranchId).finalPrice : '';
    const firstDays = firstPlan ? firstPlan.durationDays || (firstPlan.durationMonths || 1) * 30 : 30;
    const todayStr = new Date().toISOString().slice(0, 10);
    setAddForm({
      name: '',
      email: '',
      phone: '',
      gender: '',
      age: '',
      dateOfBirth: '',
      address: '',
      emergencyContact: '',
      registrationDate: todayStr,
      notes: '',
      createLoginAccess: false,
      branchId: defaultBranchId,
      fitnessGoal: 'General Fitness',
      experienceLevel: 'Beginner',
      trainerId: '',
      assignMembershipNow: true,
      planId: firstPlan?._id || '',
      startDate: todayStr,
      durationDays: firstDays,
      amount: firstPrice,
      paymentMethod: 'CASH',
      paymentStatus: 'PAID',
      paidAmount: firstPrice,
      allowAccessWithBalance: true,
      biometricEnrollment: { enabled: false, deviceId: '', biometricUserId: '' },
    });
    loadBioEnrollDevices(defaultBranchId);
    setIsAddModalOpen(true);
  };

  const handleCreateClientSubmit = async (e) => {
    e.preventDefault();
    setAddError(null);
    setAddDuplicateClient(null);
    try {
      setSubmittingAdd(true);
      const res = await adminService.createClient(addForm);
      const createdProfileId = res.client?.profileId || res.client?.id;
      let assignedMembership = null;
      let generatedInvoice = null;
      let generatedPayment = null;

      if (addForm.assignMembershipNow && addForm.planId && createdProfileId) {
        const totalFee = Number(addForm.amount || 0);
        const computedPaid =
          addForm.paymentStatus === 'PENDING'
            ? 0
            : addForm.paymentStatus === 'PARTIAL'
            ? Math.min(totalFee, Math.max(0, Number(addForm.paidAmount || 0)))
            : totalFee;

        const memRes = await adminService.createClientMembership({
          ...(res.client?.userId ? { userId: res.client.userId } : { clientProfileId: createdProfileId }),
          branchId: addForm.branchId,
          planId: addForm.planId,
          durationDays: Number(addForm.durationDays) || 30,
          amount: totalFee,
          startDate: addForm.startDate,
          paymentMethod: addForm.paymentMethod,
          paymentStatus: addForm.paymentStatus,
          paidAmount: computedPaid,
          allowAccessWithBalance: addForm.allowAccessWithBalance,
        });
        assignedMembership = memRes.membership || null;
        generatedInvoice = memRes.invoice || null;
        generatedPayment = memRes.payment || null;
      }

      setPage(1);
      await fetchClients();
      showFeedback(
        'success',
        assignedMembership
          ? `Client ${res.client?.clientId || ''} registered and membership assigned.`
          : res.message || 'Client registered successfully.'
      );
      const branchObj = branches.find((b) => b._id === addForm.branchId);
      setNewlyCreatedClient({
        ...res.client,
        id: res.client?.id || res.client?.profileId,
        branch: branchObj || { _id: addForm.branchId },
        membership: assignedMembership,
        invoice: generatedInvoice,
        payment: generatedPayment,
      });
    } catch (err) {
      if (err.status === 409 && err.data?.existingClient) {
        setAddDuplicateClient(err.data.existingClient);
      }
      setAddError(err.message || 'Failed to create client');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const getActivePlansForBranch = (branchId) => {
    return plans.filter((p) => {
      if (p.isActive === false) return false;
      if (!branchId || !p.branchPricing || p.branchPricing.length === 0) return true;
      const bp = p.branchPricing.find(
        (b) => (b.branchId?._id || b.branchId || '').toString() === branchId.toString()
      );
      return !bp || bp.isAvailable !== false;
    });
  };

  const getPlanPricingForBranch = (plan, branchId) => {
    if (!plan) return { basePrice: 0, joiningFee: 0, discount: 0, finalPrice: 0 };
    const bp = branchId
      ? plan.branchPricing?.find(
          (b) => (b.branchId?._id || b.branchId || '').toString() === branchId.toString()
        )
      : null;
    const basePrice = bp?.price ?? plan.price ?? 0;
    const joiningFee = bp?.joiningFee ?? plan.joiningFee ?? 0;
    const discount = bp?.discount ?? plan.discount ?? 0;
    const finalPrice = bp?.finalPrice ?? Math.max(0, basePrice + joiningFee - discount);
    return { basePrice, joiningFee, discount, finalPrice };
  };

  const handleOpenAssignMembershipModal = (client) => {
    setActionSheetClient(null);
    setAssignError(null);
    const targetBranchId = client.branch?._id || client.branch || branches[0]?._id;
    const branchPlans = getActivePlansForBranch(targetBranchId);
    const defaultPlan = branchPlans[0] || plans[0];
    const pricing = getPlanPricingForBranch(defaultPlan, targetBranchId);
    setAssignTargetClient(client);
    setAssignForm({
      planId: defaultPlan?._id || '',
      startDate: new Date().toISOString().slice(0, 10),
      amount: pricing.finalPrice,
      partialAmount: '',
      paymentMethod: 'CASH',
      paymentStatus: 'FULL',
      referenceNumber: '',
    });
    setIsAssignModalOpen(true);
  };

  const handleAssignMembership = async (e) => {
    e.preventDefault();
    setAssignError(null);
    if (!assignForm.planId) {
      setAssignError('Please select a membership plan.');
      return;
    }
    const clientObj = assignTargetClient || clientDetailData?.client;
    const clientId = clientObj?.id || clientObj?._id || selectedClientId;
    if (!clientId) {
      setAssignError('No client selected.');
      return;
    }
    try {
      setAssignLoading(true);
      const selectedPlan = plans.find((p) => p._id === assignForm.planId);
      const branchId = clientObj?.branch?._id || clientObj?.branch || branches[0]?._id;
      const isWalkIn = clientObj?.accountAccessStatus === 'NOT_CREATED' || clientObj?.status === 'NOT_CREATED';

      // Determine paid amount based on payment status
      let paidAmount;
      if (assignForm.paymentStatus === 'FULL') {
        paidAmount = assignForm.amount !== '' ? Number(assignForm.amount) : undefined;
      } else if (assignForm.paymentStatus === 'PARTIAL') {
        paidAmount = assignForm.partialAmount !== '' ? Number(assignForm.partialAmount) : 0;
      } else {
        // PENDING
        paidAmount = 0;
      }

      await adminService.createClientMembership({
        ...(isWalkIn ? { clientProfileId: clientId } : { userId: clientId }),
        branchId,
        planId: assignForm.planId,
        planName: selectedPlan?.name,
        amount: assignForm.amount !== '' ? Number(assignForm.amount) : undefined,
        paidAmount,
        paymentMethod: assignForm.paymentMethod || 'CASH',
        paymentStatus: assignForm.paymentStatus,
        referenceNumber: assignForm.referenceNumber || undefined,
        startDate: assignForm.startDate,
        allowAccessWithBalance: false,
      });

      setIsAssignModalOpen(false);
      showFeedback('success', 'Membership assigned successfully.');
      await fetchClients();
      if (selectedClientId === clientId) {
        handleOpenClientDetails(clientId);
      }
    } catch (err) {
      setAssignError(err.message || 'Failed to assign membership');
    } finally {
      setAssignLoading(false);
    }
  };

  // ── Record Payment handler ──
  const handleOpenRecordPayment = (invoice) => {
    setRecordPaymentInvoice(invoice);
    setRecordPaymentError(null);
    setRecordPaymentForm({
      amount: invoice.balanceAmount || '',
      paymentMethod: 'CASH',
      paymentDate: new Date().toISOString().slice(0, 10),
      referenceNumber: '',
      notes: '',
    });
    setIsRecordPaymentOpen(true);
  };

  const handleSubmitRecordPayment = async (e) => {
    e.preventDefault();
    if (!recordPaymentInvoice) return;
    setRecordPaymentError(null);
    try {
      setRecordPaymentLoading(true);
      await adminService.recordInvoicePayment(recordPaymentInvoice._id || recordPaymentInvoice.id, {
        amount: Number(recordPaymentForm.amount),
        paymentMethod: recordPaymentForm.paymentMethod,
        paymentDate: recordPaymentForm.paymentDate,
        referenceNumber: recordPaymentForm.referenceNumber || undefined,
        notes: recordPaymentForm.notes || undefined,
      });
      setIsRecordPaymentOpen(false);
      showFeedback('success', `Payment of ₹${recordPaymentForm.amount} recorded successfully.`);
      if (selectedClientId) {
        await handleOpenClientDetails(selectedClientId);
        // Refresh invoices
        const invRes = await adminService.getClientInvoices(selectedClientId).catch(() => ({ invoices: [] }));
        setClientInvoices(invRes.invoices || []);
      }
    } catch (err) {
      setRecordPaymentError(err.message || 'Failed to record payment');
    } finally {
      setRecordPaymentLoading(false);
    }
  };

  // ── Create Login Access handler ──
  const handleCreateLoginAccess = async () => {
    if (!selectedClientId) return;
    setCreatingLoginAccess(true);
    setLoginAccessResult(null);
    try {
      const res = await adminService.createClientLoginAccess(selectedClientId);
      setLoginAccessResult({ success: true, message: res.message || 'Login access created.', url: res.manualActivationUrl });
      showFeedback('success', 'Login access created successfully.');
      await handleOpenClientDetails(selectedClientId);
    } catch (err) {
      setLoginAccessResult({ success: false, message: err.message || 'Failed to create login access' });
    } finally {
      setCreatingLoginAccess(false);
    }
  };

  const getMembershipDisplay = (membership) => {
    if (!membership) {
      return {
        hasRecord: false,
        label: 'NO MEMBERSHIP',
        badgeClass: 'bg-[#202020] text-[#B8B8B8] border-[#303030]',
        state: 'NONE',
      };
    }
    const isActive = membership.status === 'ACTIVE' && !membership.isExpired;
    if (isActive) {
      return {
        hasRecord: true,
        label: 'ACTIVE',
        badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        state: 'ACTIVE',
      };
    }
    if (membership.status === 'PENDING' || membership.status === 'PENDING_PAYMENT') {
      return {
        hasRecord: true,
        label: 'PENDING PAYMENT',
        badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        state: 'PENDING',
      };
    }
    if (membership.status === 'CANCELLED') {
      return {
        hasRecord: true,
        label: 'CANCELLED',
        badgeClass: 'bg-[#202020] text-[#B8B8B8] border-[#303030]',
        state: 'CANCELLED',
      };
    }
    return {
      hasRecord: true,
      label: 'EXPIRED',
      badgeClass: 'bg-[#F03B2E]/15 text-[#FF493B] border-[#F03B2E]/35',
      state: 'EXPIRED',
    };
  };

  const renderAccountBadge = (status) => {
    if (status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
          ACTIVE
        </span>
      );
    }
    if (status === 'SUSPENDED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F03B2E]/15 text-[#FF493B] border border-[#F03B2E]/35 whitespace-nowrap">
          SUSPENDED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#202020] text-[#858585] border border-[#303030] whitespace-nowrap">
        {status || 'INACTIVE'}
      </span>
    );
  };

  const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(totalCount, page * pageSize);

  return (
    <div className="space-y-5 sm:space-y-6 min-w-0">
      {/* ── HEADER & PRIMARY CTA ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="mm-page-title text-2xl sm:text-3xl">
            CLIENT MANAGEMENT DIRECTORY
          </h2>
          <p className="text-xs sm:text-sm text-[#B8B8B8] mt-1">
            Total {totalCount} registered athletes across Kovilpatti, Karur and Sivakasi.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#202020] hover:bg-[#252525] text-[#F5F5F5] border border-[#303030] hover:border-[#F03B2E] transition-colors cursor-pointer w-full sm:w-auto"
          >
            <Download className="w-4 h-4 text-[#F03B2E] shrink-0" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="min-h-[44px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#F03B2E] hover:bg-[#FF493B] text-white transition-all cursor-pointer shadow-lg shadow-[#F03B2E]/15 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* ── ACTION FEEDBACK BANNER ── */}
      {actionFeedback && (
        <div
          role="status"
          className={`rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs border ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-200'
              : 'bg-[#F03B2E]/10 border-[#F03B2E]/40 text-[#FF6A5E]'
          }`}
        >
          <span className="min-w-0 break-words">{actionFeedback.message}</span>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            aria-label="Dismiss notification"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-black/20 shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── SEARCH & FILTERS BAR ── */}
      <div className="bg-[#111111] border border-[#303030] rounded-2xl p-3.5 sm:p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-[#858585] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Client ID (MM...), name, phone, or email..."
              aria-label="Search clients by Client ID, name, phone, or email"
              className="w-full min-h-[44px] pl-10 pr-10 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] placeholder-[#858585] focus:border-[#F03B2E] focus:outline-none transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear search"
                className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[#858585] hover:text-[#F5F5F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase tracking-wider text-[#F5F5F5] cursor-pointer shrink-0"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Branch filter */}
          <select
            aria-label="Filter clients by branch"
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setPage(1);
            }}
            className="w-full min-h-[44px] px-3 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Branches</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.city} Branch
              </option>
            ))}
          </select>

          {/* Membership Status filter */}
          <select
            aria-label="Filter clients by membership status"
            value={membershipStatus}
            onChange={(e) => {
              setMembershipStatus(e.target.value);
              setPage(1);
            }}
            className="w-full min-h-[44px] px-3 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Memberships</option>
            <option value="ACTIVE">Active Membership</option>
            <option value="PENDING">Pending Payment</option>
            <option value="EXPIRED">Expired Membership</option>
            <option value="CANCELLED">Cancelled Membership</option>
            <option value="NO_MEMBERSHIP">No Membership</option>
          </select>

          {/* Account Status filter */}
          <select
            aria-label="Filter clients by account status"
            value={accountStatus}
            onChange={(e) => {
              setAccountStatus(e.target.value);
              setPage(1);
            }}
            className="w-full min-h-[44px] px-3 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Account Status</option>
            <option value="ACTIVE">Active Accounts</option>
            <option value="SUSPENDED">Suspended Accounts</option>
            <option value="INACTIVE">Inactive Accounts</option>
          </select>

          {/* Assigned Trainer filter */}
          <select
            aria-label="Filter clients by assigned trainer"
            value={trainerFilter}
            onChange={(e) => {
              setTrainerFilter(e.target.value);
              setPage(1);
            }}
            className="w-full min-h-[44px] px-3 py-2 bg-[#181818] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Trainers</option>
            <option value="UNASSIGNED">No Trainer Assigned</option>
            {activeTrainers.map((t) => (
              <option key={t.id} value={t.id}>
                Coach: {t.name}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#181818] hover:bg-[#202020] border border-[#303030] text-[11px] font-bold uppercase tracking-wider text-[#B8B8B8] hover:text-[#F5F5F5] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#F03B2E]" />
              <span>Clear Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* ── ERROR NOTICE & RETRY ── */}
      {error && (
        <div className="bg-[#F03B2E]/10 border border-[#F03B2E]/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#FF493B]">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider">Client Database Sync Error</p>
              <p className="text-xs text-[#B8B8B8] break-words">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchClients}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-[#F03B2E]/20 hover:bg-[#F03B2E]/30 text-xs font-bold uppercase text-[#F5F5F5] transition-colors cursor-pointer w-full sm:w-auto"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── CLIENTS LIST: DESKTOP TABLE (>= 1024px) & MOBILE/TABLET CARDS (< 1024px) ── */}
      {loading ? (
        <div className="bg-[#181818] border border-[#303030] rounded-2xl py-12 text-center text-xs text-[#B8B8B8]">
          Loading athletes database...
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-[#181818] border border-[#303030] rounded-2xl py-12 px-4 text-center space-y-3">
          <p className="text-sm font-bold text-[#F5F5F5]">No clients found</p>
          <p className="text-xs text-[#858585]">
            No clients match the specified search or filter criteria.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#202020] border border-[#303030] text-xs font-bold uppercase text-[#F5F5F5] cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── DESKTOP TABLE (>= 1024px, Preserved Design) ── */}
          <div className="hidden lg:block bg-[#181818] border border-[#303030] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#303030] bg-[#111111] text-[11px] font-mono uppercase tracking-wider text-[#B8B8B8]">
                    <th className="py-3.5 px-4 font-semibold">Athlete</th>
                    <th className="py-3.5 px-4 font-semibold">Contact</th>
                    <th className="py-3.5 px-4 font-semibold">Branch</th>
                    <th className="py-3.5 px-4 font-semibold">Membership</th>
                    <th className="py-3.5 px-4 font-semibold">Trainer</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#202020] text-xs">
                  {clients.map((c) => {
                    const mDisplay = getMembershipDisplay(c.membership);
                    return (
                      <tr key={c.id || c._id} className="hover:bg-[#202020] transition-colors">
                        {/* Athlete info */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#F03B2E]/10 border border-[#F03B2E]/30 flex items-center justify-center text-[#F03B2E] font-bold text-xs shrink-0">
                              {c.name ? c.name[0].toUpperCase() : 'U'}
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[#F5F5F5]">{c.name}</span>
                                {(c.accountAccessStatus === 'NOT_CREATED' || c.status === 'NOT_CREATED') && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#303030] text-[#B8B8B8] border border-[#404040]">
                                    WALK-IN
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[#B8B8B8] font-mono">
                                <strong className="text-[#F03B2E]">{c.clientId || '—'}</strong> • Joined{' '}
                                {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="text-[#F5F5F5] font-mono">{c.phone || '—'}</span>
                            <span className="text-[10px] text-[#B8B8B8]">{c.email || 'No email'}</span>
                          </div>
                        </td>

                        {/* Branch */}
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-[#252525] text-[#F03B2E] font-bold text-[10px] font-mono">
                            {c.branch?.city || 'HQ'}
                          </span>
                        </td>

                        {/* Membership */}
                        <td className="py-3 px-4">
                          {c.membership ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-[#F5F5F5] truncate max-w-[140px]">
                                {c.membership.planName}
                              </span>
                              <span
                                className={`text-[10px] font-mono ${
                                  mDisplay.state === 'ACTIVE'
                                    ? 'text-emerald-400 font-semibold'
                                    : mDisplay.state === 'PENDING'
                                    ? 'text-amber-400 font-semibold'
                                    : 'text-[#FF493B] font-bold'
                                }`}
                              >
                                {mDisplay.label}
                                {c.membership.expiryDate
                                  ? ` • ${new Date(c.membership.expiryDate).toLocaleDateString()}`
                                  : ''}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-mono font-bold uppercase text-[#858585]">
                              NO ACTIVE MEMBERSHIP
                            </span>
                          )}
                        </td>

                        {/* Assigned Trainer */}
                        <td className="py-3 px-4">
                          {c.trainer ? (
                            <span className="text-xs font-medium text-[#F5F5F5]">{c.trainer.name}</span>
                          ) : (
                            <span className="text-[11px] text-[#B8B8B8]">No Trainer Assigned</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">{renderAccountBadge(c.status)}</td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenClientDetails(c.id || c._id)}
                              className="px-2.5 py-1 rounded-lg bg-[#252525] hover:bg-[#F03B2E] hover:text-white text-[#F5F5F5] font-semibold text-[11px] transition-colors cursor-pointer"
                            >
                              Dossier
                            </button>
                            <button
                              type="button"
                              disabled={busyClientId === (c.id || c._id)}
                              onClick={() => requestToggleStatus(c)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                c.status === 'ACTIVE'
                                  ? 'text-[#B8B8B8] hover:text-[#FF493B]'
                                  : 'text-emerald-400 hover:text-emerald-300'
                              }`}
                              title={c.status === 'ACTIVE' ? 'Suspend Account' : 'Reactivate Account'}
                              aria-label={c.status === 'ACTIVE' ? `Suspend ${c.name}` : `Reactivate ${c.name}`}
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── MOBILE & TABLET CLIENT CARDS (< 1024px) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 lg:hidden">
            {clients.map((c) => {
              const clientId = c.id || c._id;
              const mDisplay = getMembershipDisplay(c.membership);
              const busy = busyClientId === clientId;

              return (
                <article
                  key={clientId}
                  className="bg-[#181818] border border-[#303030] rounded-xl p-4 flex flex-col justify-between gap-3.5 min-w-0"
                >
                  {/* Card Header: Avatar + Name + Account Status + 3-dot Menu */}
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-[#F03B2E]/15 border border-[#F03B2E]/35 flex items-center justify-center text-[#F03B2E] font-bold text-sm shrink-0">
                        {c.name ? c.name[0].toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="font-display text-base sm:text-lg font-bold uppercase text-[#F5F5F5] leading-tight truncate">
                          {c.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F03B2E]/15 text-[#F03B2E] border border-[#F03B2E]/30">
                            {c.clientId || '—'}
                          </span>
                          {renderAccountBadge(c.status)}
                          {(c.accountAccessStatus === 'NOT_CREATED' || c.status === 'NOT_CREATED') && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#303030] text-[#B8B8B8] border border-[#404040]">
                              WALK-IN
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setActionSheetClient(c)}
                      aria-label={`Open actions for ${c.name}`}
                      aria-haspopup="dialog"
                      className="min-w-[44px] min-h-[44px] -mr-1.5 -mt-1 flex items-center justify-center rounded-lg bg-[#202020] hover:bg-[#303030] text-[#F5F5F5] border border-[#303030] hover:border-[#F03B2E] cursor-pointer shrink-0 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Client Contact & Registration Details */}
                  <div className="space-y-1.5 text-xs text-[#B8B8B8] border-t border-[#252525] pt-3 min-w-0">
                    <div className="flex items-start gap-2 min-w-0">
                      <Mail className="w-3.5 h-3.5 text-[#F03B2E] shrink-0 mt-0.5" />
                      <span className="break-all min-w-0 text-[#F5F5F5]">{c.email || <span className="text-[#858585] italic">No email</span>}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <Phone className="w-3.5 h-3.5 text-[#F03B2E] shrink-0" />
                      <span className="font-mono text-[#F5F5F5]">{c.phone || <span className="text-[#858585] italic">No phone</span>}</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-[#858585]">
                      <span className="inline-flex items-center gap-1 font-semibold text-[#F5F5F5]">
                        <Building className="w-3 h-3 text-[#F03B2E]" />
                        {c.branch?.city || 'HQ'} Branch
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" />
                        Joined {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Real Membership Box */}
                  <div className="rounded-lg bg-[#111111] border border-[#252525] p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#858585] inline-flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-[#F03B2E]" />
                        Membership
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border whitespace-nowrap ${mDisplay.badgeClass}`}
                      >
                        {mDisplay.label}
                      </span>
                    </div>

                    {mDisplay.hasRecord ? (
                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-[#F5F5F5] truncate">{c.membership.planName}</div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#858585]">
                          <span>
                            Start:{' '}
                            {c.membership.startDate
                              ? new Date(c.membership.startDate).toLocaleDateString()
                              : '—'}
                          </span>
                          <span className={mDisplay.state === 'ACTIVE' ? 'text-emerald-400' : 'text-[#FF493B]'}>
                            Exp:{' '}
                            {c.membership.expiryDate
                              ? new Date(c.membership.expiryDate).toLocaleDateString()
                              : '—'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono font-semibold text-[#B8B8B8]">
                          NO ACTIVE MEMBERSHIP
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenAssignMembershipModal(c)}
                          className="text-[11px] font-bold uppercase text-[#F03B2E] hover:text-[#FF493B] underline cursor-pointer shrink-0"
                        >
                          Assign
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Assigned Trainer Row */}
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#111111] border border-[#252525] text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Dumbbell className="w-3.5 h-3.5 text-[#F03B2E] shrink-0" />
                      <span className="truncate text-[#F5F5F5] font-medium">
                        {c.trainer ? c.trainer.name : 'No Trainer Assigned'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenTrainerModal(c)}
                      className="text-[11px] font-bold uppercase text-[#F03B2E] hover:text-[#FF493B] cursor-pointer shrink-0"
                    >
                      {c.trainer ? 'Change' : 'Assign'}
                    </button>
                  </div>

                  {/* Card Footer */}
                  <div className="flex items-center gap-2 pt-1 border-t border-[#252525]">
                    <button
                      type="button"
                      onClick={() => handleOpenClientDetails(clientId)}
                      className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase tracking-wider text-[#F5F5F5] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#B8B8B8]" />
                      <span>View Client</span>
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setActionSheetClient(c)}
                      className="flex-1 min-h-[44px] px-3.5 py-2 rounded-lg bg-[#F03B2E]/15 hover:bg-[#F03B2E]/25 border border-[#F03B2E]/40 text-xs font-bold uppercase tracking-wider text-[#F5F5F5] inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#F03B2E]" />
                      <span>{busy ? 'Working...' : 'Manage Client'}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* ── PAGINATION BAR ── */}
          <div className="bg-[#181818] border border-[#303030] rounded-xl px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#B8B8B8]">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <span>
                Showing <strong className="text-[#F5F5F5]">{startIndex}–{endIndex}</strong> of{' '}
                <strong className="text-[#F5F5F5]">{totalCount}</strong> athletes
              </span>
              <label className="inline-flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-[#858585]">Per page</span>
                <select
                  aria-label="Clients per page"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-[#111111] border border-[#303030] rounded-lg px-2.5 py-1.5 min-h-[36px] text-xs text-[#F5F5F5] cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase tracking-wider text-[#F5F5F5] inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <span className="font-mono text-xs text-[#F5F5F5] px-2 whitespace-nowrap">
                Page {page} / {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase tracking-wider text-[#F5F5F5] inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── MOBILE CLIENT ACTION BOTTOM SHEET ── */}
      {actionSheetClient && (() => {
        const mInfo = getMembershipDisplay(actionSheetClient.membership);
        const sheetId = actionSheetClient.id || actionSheetClient._id;
        return (
          <div
            id="client-action-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={`Manage ${actionSheetClient.name}`}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setActionSheetClient(null)}
          >
            <div
              className="bg-[#181818] border-t sm:border border-[#303030] rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[88dvh] flex flex-col overflow-hidden shadow-2xl pb-[env(safe-area-inset-bottom)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pt-2.5 sm:pt-4 px-5 pb-4 border-b border-[#252525] shrink-0">
                <div className="w-10 h-1 bg-[#303030] rounded-full mx-auto mb-3 sm:hidden" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-label text-[#F03B2E] block mb-0.5">CLIENT ACTIONS</span>
                    <h3 className="mm-page-title text-lg sm:text-xl truncate">
                      {actionSheetClient.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {renderAccountBadge(actionSheetClient.status)}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${mInfo.badgeClass}`}
                      >
                        {mInfo.label}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActionSheetClient(null)}
                    aria-label="Close action menu"
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#202020] text-[#B8B8B8] hover:text-white border border-[#303030] cursor-pointer shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto overscroll-contain space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleOpenClientDetails(sheetId)}
                    className="min-h-[48px] px-3 py-2.5 rounded-xl bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center gap-2 cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-[#F03B2E] shrink-0" />
                    <span className="truncate">View Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(actionSheetClient)}
                    className="min-h-[48px] px-3 py-2.5 rounded-xl bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center gap-2 cursor-pointer"
                  >
                    <Edit className="w-4 h-4 text-[#F03B2E] shrink-0" />
                    <span className="truncate">Edit Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenTrainerModal(actionSheetClient)}
                    className="min-h-[48px] px-3 py-2.5 rounded-xl bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center gap-2 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-[#F03B2E] shrink-0" />
                    <span className="truncate">
                      {actionSheetClient.trainer ? 'Change Trainer' : 'Assign Trainer'}
                    </span>
                  </button>

                  {mInfo.state === 'ACTIVE' || mInfo.state === 'PENDING' ? (
                    <button
                      type="button"
                      onClick={() => handleOpenClientDetails(sheetId, 'membership')}
                      className="min-h-[48px] px-3 py-2.5 rounded-xl bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center gap-2 cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4 text-[#F03B2E] shrink-0" />
                      <span className="truncate">View Membership</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenAssignMembershipModal(actionSheetClient)}
                      className="min-h-[48px] px-3 py-2.5 rounded-xl bg-[#F03B2E]/15 hover:bg-[#F03B2E]/25 border border-[#F03B2E]/40 text-xs font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center gap-2 cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4 text-[#F03B2E] shrink-0" />
                      <span className="truncate">
                        {mInfo.state === 'EXPIRED' || mInfo.state === 'CANCELLED'
                          ? 'Renew Pass'
                          : 'Assign Membership'}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenClientDetails(sheetId, 'attendance')}
                    className="min-h-[48px] px-3 py-2.5 rounded-xl bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center gap-2 cursor-pointer"
                  >
                    <CalendarCheck className="w-4 h-4 text-[#F03B2E] shrink-0" />
                    <span className="truncate">Attendance</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenClientDetails(sheetId, 'payments')}
                    className="min-h-[48px] px-3 py-2.5 rounded-xl bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center gap-2 cursor-pointer"
                  >
                    <Receipt className="w-4 h-4 text-[#F03B2E] shrink-0" />
                    <span className="truncate">Payments</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenPasswordModal(actionSheetClient)}
                    className="min-h-[48px] px-3 py-2.5 rounded-xl bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center gap-2 cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-[#F03B2E] shrink-0" />
                    <span className="truncate">Reset Password</span>
                  </button>

                  {actionSheetClient.status === 'ACTIVE' ? (
                    <button
                      type="button"
                      onClick={() => requestToggleStatus(actionSheetClient)}
                      className="min-h-[48px] px-3 py-2.5 rounded-xl bg-[#F03B2E]/15 hover:bg-[#F03B2E]/25 border border-[#F03B2E]/40 text-xs font-bold uppercase tracking-wider text-[#FF493B] flex items-center gap-2 cursor-pointer"
                    >
                      <PauseCircle className="w-4 h-4 shrink-0" />
                      <span className="truncate">Suspend</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => requestToggleStatus(actionSheetClient)}
                      className="min-h-[48px] px-3 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span className="truncate">Reactivate</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── CONFIRMATION DIALOG ── */}
      {confirmDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={confirmDialog.title}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setConfirmDialog(null)}
        >
          <div
            className="bg-[#181818] border-t sm:border border-[#303030] rounded-t-2xl sm:rounded-xl w-full sm:max-w-md p-5 sm:p-6 space-y-4 shadow-2xl pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-label text-[#F03B2E] block mb-1">CONFIRM ACTION</span>
                <h3 className="mm-page-title text-lg sm:text-xl">{confirmDialog.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                aria-label="Close confirmation dialog"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#202020] text-[#B8B8B8] hover:text-white border border-[#303030] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[#B8B8B8] leading-relaxed">
              {confirmDialog.description}
            </p>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="min-h-[44px] px-4 py-2 rounded-lg bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase text-[#B8B8B8] cursor-pointer w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`min-h-[44px] px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-white cursor-pointer w-full sm:w-auto ${
                  confirmDialog.tone === 'emerald'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-[#F03B2E] hover:bg-[#FF493B]'
                }`}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CLIENT 360 DOSSIER DRAWER / BOTTOM SHEET (6 ORGANIZED SECTIONS) ── */}
      {selectedClientId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Client Dossier"
          className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-end bg-black/80 backdrop-blur-sm"
          onClick={() => {
            setSelectedClientId(null);
            setClientDetailData(null);
          }}
        >
          <div
            className="w-full sm:max-w-2xl bg-[#111111] border-t sm:border-t-0 sm:border-l border-[#303030] rounded-t-2xl sm:rounded-none h-[92dvh] sm:h-full flex flex-col overflow-hidden shadow-2xl pb-[env(safe-area-inset-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header */}
            <div className="px-5 py-4 border-b border-[#303030] bg-[#111111] flex items-start justify-between gap-3 shrink-0">
              {clientDetailData ? (
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-[#F03B2E]/20 border border-[#F03B2E]/40 flex items-center justify-center text-[#F03B2E] font-bold text-base shrink-0">
                    {clientDetailData.client.name ? clientDetailData.client.name[0].toUpperCase() : 'U'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h3 className="font-display text-lg sm:text-xl font-bold uppercase text-[#F5F5F5] truncate">
                      {clientDetailData.client.name}
                    </h3>
                    <span className="text-[11px] text-[#B8B8B8] font-mono truncate">
                      <strong className="text-[#F03B2E]">{clientDetailData.client.clientId || clientDetailData.profile?.clientId || '—'}</strong> • Joined{' '}
                      {new Date(clientDetailData.client.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-sm font-bold uppercase text-[#F5F5F5]">Loading Client Dossier...</div>
              )}

              <button
                type="button"
                onClick={() => {
                  setSelectedClientId(null);
                  setClientDetailData(null);
                }}
                aria-label="Close client dossier"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#202020] text-[#B8B8B8] hover:text-white border border-[#303030] cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Independently Scrollable 6 Sections */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-5">
              {detailLoading || !clientDetailData ? (
                <div className="py-12 text-center text-xs text-[#B8B8B8]">Loading athlete profile...</div>
              ) : (
                <>
                  {/* 1. Personal Information */}
                  <section className="bg-[#181818] border border-[#303030] rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono uppercase text-[#F03B2E] font-bold block">
                        1. Personal Information
                      </span>
                      {clientDetailData.client.accountAccessStatus === 'NOT_CREATED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#303030] text-[#B8B8B8] border border-[#404040]">
                          WALK-IN
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-[#858585] block">Full Name</span>
                        <p className="font-bold text-[#F5F5F5] mt-0.5">{clientDetailData.client.name}</p>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono uppercase text-[#858585] block">Email</span>
                        <p className="font-bold text-[#F5F5F5] mt-0.5 break-all">
                          {clientDetailData.client.email || <span className="text-[#858585] italic">Not provided</span>}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-[#858585] block">Mobile</span>
                        <p className="font-mono font-bold text-[#F5F5F5] mt-0.5">
                          {clientDetailData.client.phone || <span className="text-[#858585] italic">Not provided</span>}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-[#858585] block">Goal &amp; Level</span>
                        <p className="font-bold text-[#F5F5F5] mt-0.5">
                          {clientDetailData.profile?.fitnessGoal || 'General Fitness'} •{' '}
                          {clientDetailData.profile?.experienceLevel || 'Beginner'}
                        </p>
                      </div>
                      {clientDetailData.profile?.gender && (
                        <div>
                          <span className="text-[10px] font-mono uppercase text-[#858585] block">Gender</span>
                          <p className="font-bold text-[#F5F5F5] mt-0.5">{clientDetailData.profile.gender}</p>
                        </div>
                      )}
                      {clientDetailData.profile?.dateOfBirth && (
                        <div>
                          <span className="text-[10px] font-mono uppercase text-[#858585] block">Date of Birth</span>
                          <p className="font-mono font-bold text-[#F5F5F5] mt-0.5">
                            {new Date(clientDetailData.profile.dateOfBirth).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {clientDetailData.profile?.address && (
                        <div className="sm:col-span-2">
                          <span className="text-[10px] font-mono uppercase text-[#858585] block">Address</span>
                          <p className="font-bold text-[#F5F5F5] mt-0.5">{clientDetailData.profile.address}</p>
                        </div>
                      )}
                      {clientDetailData.profile?.emergencyContact && (
                        <div>
                          <span className="text-[10px] font-mono uppercase text-[#858585] block">Emergency Contact</span>
                          <p className="font-bold text-[#F5F5F5] mt-0.5">{clientDetailData.profile.emergencyContact}</p>
                        </div>
                      )}
                      {clientDetailData.profile?.registrationSource && (
                        <div>
                          <span className="text-[10px] font-mono uppercase text-[#858585] block">Registration</span>
                          <p className="font-bold text-[#F5F5F5] mt-0.5">
                            {clientDetailData.profile.registrationSource === 'ADMIN_REGISTERED' ? 'Admin Registered' : 'Self Registered'}
                          </p>
                        </div>
                      )}
                      {clientDetailData.profile?.notes && (
                        <div className="sm:col-span-2">
                          <span className="text-[10px] font-mono uppercase text-[#858585] block">Notes</span>
                          <p className="text-[#B8B8B8] mt-0.5 italic">{clientDetailData.profile.notes}</p>
                        </div>
                      )}
                      <div className="sm:col-span-2 pt-2 border-t border-[#252525] flex flex-wrap gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${clientDetailData.client.phone ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-[#202020] text-[#858585] border-[#303030]'}`}>
                          WhatsApp: {clientDetailData.client.phone ? (clientDetailData.profile?.whatsappOptIn === false ? 'Opted Out' : 'Available') : 'Unavailable'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${clientDetailData.client.email ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-[#202020] text-[#858585] border-[#303030]'}`}>
                          Email: {clientDetailData.client.email ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                    </div>
                  </section>

                  {/* 2. Account Information */}
                  <section className="bg-[#181818] border border-[#303030] rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono uppercase text-[#F03B2E] font-bold">
                        2. Account Information
                      </span>
                      {renderAccountBadge(clientDetailData.client.status)}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-[#858585] block">Home Branch</span>
                        <p className="font-bold text-[#F5F5F5] mt-0.5">
                          {clientDetailData.client.branch?.city || 'Kovilpatti HQ'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-[#858585] block">Registered</span>
                        <p className="font-mono text-[#F5F5F5] mt-0.5">
                          {new Date(clientDetailData.client.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-[#858585] block">Portal Access</span>
                        <p className="font-bold mt-0.5">
                          {clientDetailData.client.accountAccessStatus === 'NOT_CREATED'
                            ? <span className="text-[#858585]">NOT_CREATED</span>
                            : clientDetailData.client.accountAccessStatus === 'INVITATION_PENDING'
                            ? <span className="text-amber-400">INVITATION_PENDING</span>
                            : <span className="text-emerald-400">ACTIVE</span>
                          }
                        </p>
                      </div>
                    </div>

                    {loginAccessResult && (
                      <div className={`p-3 rounded-lg border text-xs ${loginAccessResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-[#F03B2E]/10 border-[#F03B2E]/30 text-[#FF6A5E]'}`}>
                        <p>{loginAccessResult.message}</p>
                        {loginAccessResult.url && (
                          <p className="font-mono mt-1 break-all text-[10px] text-[#B8B8B8]">
                            Activation URL: {loginAccessResult.url}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-[#252525]">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(clientDetailData.client)}
                        className="min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#202020] hover:bg-[#303030] text-xs font-semibold text-[#F5F5F5] border border-[#303030] cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit Profile</span>
                      </button>

                      {clientDetailData.client.accountAccessStatus !== 'NOT_CREATED' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenPasswordModal(clientDetailData.client)}
                            className="min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#202020] hover:bg-[#303030] text-xs font-semibold text-[#F5F5F5] border border-[#303030] cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Reset Password</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => requestToggleStatus(clientDetailData.client)}
                            className={`min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                              clientDetailData.client.status === 'ACTIVE'
                                ? 'bg-[#F03B2E]/10 text-[#FF493B] border-[#F03B2E]/35'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            <span>
                              {clientDetailData.client.status === 'ACTIVE' ? 'Suspend Account' : 'Reactivate Account'}
                            </span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={handleCreateLoginAccess}
                          disabled={creatingLoginAccess}
                          className="min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-400 border border-emerald-500/30 cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{creatingLoginAccess ? 'Creating...' : 'Create Login Access'}</span>
                        </button>
                      )}
                    </div>
                  </section>

                  {/* 3. Membership Information */}
                  <section
                    ref={membershipSectionRef}
                    className="bg-[#181818] border border-[#303030] rounded-xl p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono uppercase text-[#F03B2E] font-bold">
                        3. Membership Information
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          clientDetailData.activeMembership
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-[#252525] text-[#B8B8B8] border-[#303030]'
                        }`}
                      >
                        {clientDetailData.activeMembership ? 'ACTIVE' : 'NO ACTIVE MEMBERSHIP'}
                      </span>
                    </div>

                    {clientDetailData.activeMembership ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] text-[#B8B8B8] block uppercase">Plan</span>
                          <p className="font-bold text-[#F5F5F5]">{clientDetailData.activeMembership.planName}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#B8B8B8] block uppercase">Start Date</span>
                          <p className="font-mono text-[#F5F5F5]">
                            {new Date(clientDetailData.activeMembership.startDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#B8B8B8] block uppercase">Expiry Date</span>
                          <p className="font-mono text-emerald-400 font-bold">
                            {new Date(clientDetailData.activeMembership.expiryDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#B8B8B8] block uppercase">Price</span>
                          <p className="font-bold text-[#F03B2E]">
                            ₹{clientDetailData.activeMembership.finalAmount || clientDetailData.activeMembership.amount || 0}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <p className="text-xs font-mono font-bold text-[#B8B8B8]">
                          NO ACTIVE MEMBERSHIP
                          {clientDetailData.latestMembership
                            ? ` (Latest record: ${clientDetailData.latestMembership.planName} — ${clientDetailData.latestMembership.status})`
                            : ''}
                        </p>
                        <div className="pt-2 border-t border-[#252525] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <p className="text-xs text-[#858585]">
                            Assign a verified plan pass directly from Admin.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleOpenAssignMembershipModal(clientDetailData.client)}
                            className="min-h-[44px] px-4 py-2 rounded-lg bg-[#F03B2E] hover:bg-[#FF493B] text-white text-xs font-bold uppercase transition-all cursor-pointer w-full sm:w-auto"
                          >
                            {clientDetailData.latestMembership ? 'Renew Membership' : 'Assign Membership'}
                          </button>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* 4. Trainer Information */}
                  <section className="bg-[#181818] border border-[#303030] rounded-xl p-4 space-y-3">
                    <span className="text-[11px] font-mono uppercase text-[#F03B2E] font-bold block">
                      4. Trainer Information
                    </span>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 text-xs">
                        {clientDetailData.profile?.trainerId && (
                          <TrainerAvatar trainer={clientDetailData.profile.trainerId} size="sm" rounded="rounded-lg" />
                        )}
                        <div>
                          <span className="text-[10px] font-mono uppercase text-[#858585] block">
                            Assigned Coach
                          </span>
                          <p className="font-bold text-[#F5F5F5] mt-0.5">
                            {clientDetailData.profile?.trainerId?.name || 'No Trainer Assigned'}
                          </p>
                        </div>
                      </div>
                      <select
                        aria-label="Assign active trainer"
                        value={clientDetailData.profile?.trainerId?._id || ''}
                        onChange={(e) => handleAssignTrainerInline(e.target.value)}
                        className="min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl text-xs text-[#F5F5F5] px-3 py-2 focus:border-[#F03B2E] focus:outline-none w-full sm:w-auto"
                      >
                        <option value="">No Trainer Assigned</option>
                        {activeTrainers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.branch?.city})
                          </option>
                        ))}
                      </select>
                    </div>
                  </section>

                  {/* 5. Biometric Information */}
                  <section className="bg-[#181818] border border-[#303030] rounded-xl p-4 space-y-3">
                    {(() => {
                      const bio = clientDetailData.biometricSummary || {};
                      const status = bio.displayStatus || 'NOT_ENROLLED';
                      return (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[11px] font-mono uppercase text-[#F03B2E] font-bold flex items-center gap-1.5">
                              <Fingerprint className="w-3.5 h-3.5" />
                              5. Biometric Information
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getBiometricStatusBadge(status)}`}>
                              {getBiometricStatusLabel(status)}
                            </span>
                          </div>

                          {['DEVICE_USER_READY', 'AWAITING_PHYSICAL_ENROLLMENT', 'DEVICE_USER_SYNCING', 'PENDING'].includes(status) && (
                            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                              {status === 'DEVICE_USER_READY'
                                ? `Device user PIN ${bio.biometricUserId || ''} is confirmed on the terminal, but physical face enrollment is still pending.`
                                : status === 'DEVICE_USER_SYNCING'
                                  ? `Syncing PIN ${bio.biometricUserId || ''} to ${bio.deviceName || 'the biometric device'}. Physical face enrollment is still pending.`
                                  : `Member still needs physical face enrollment at ${bio.deviceName || 'the branch terminal'} under PIN ${bio.biometricUserId || 'assigned PIN'}.`}
                            </div>
                          )}

                          {bio.failureReason && (
                            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                              {bio.failureReason}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-[10px] font-mono uppercase text-[#858585] block">Biometric User ID / PIN</span>
                              <p className="font-mono font-bold text-[#F5F5F5] mt-0.5">{bio.biometricUserId || 'Not Assigned'}</p>
                            </div>
                            <div>
                              <span className="text-[10px] font-mono uppercase text-[#858585] block">Gym Access Status</span>
                              <p className="font-mono font-bold text-[#F5F5F5] mt-0.5">{(bio.gymAccessStatus || 'NOT_ENROLLED').replace(/_/g, ' ')}</p>
                            </div>
                            <div>
                              <span className="text-[10px] font-mono uppercase text-[#858585] block">Device User Status</span>
                              <p className="font-mono text-[#F5F5F5] mt-0.5">{(bio.deviceEnrollmentStatus || 'NOT_STARTED').replace(/_/g, ' ')}</p>
                            </div>
                            <div>
                              <span className="text-[10px] font-mono uppercase text-[#858585] block">Face Enrollment Status</span>
                              <p className="font-mono text-[#F5F5F5] mt-0.5">{(bio.faceEnrollmentStatus || 'NOT_ENROLLED').replace(/_/g, ' ')}</p>
                            </div>
                            <div>
                              <span className="text-[10px] font-mono uppercase text-[#858585] block">Registered Device</span>
                              <p className="text-[#F5F5F5] mt-0.5">{bio.deviceName || 'Not Assigned'}</p>
                            </div>
                            <div>
                              <span className="text-[10px] font-mono uppercase text-[#858585] block">Device Serial Number</span>
                              <p className="font-mono text-[#F5F5F5] mt-0.5">{bio.serialNumber || 'Not Assigned'}</p>
                            </div>
                            <div>
                              <span className="text-[10px] font-mono uppercase text-[#858585] block">Assigned Branch</span>
                              <p className="text-[#F5F5F5] mt-0.5">{bio.branchName || clientDetailData.client?.branch?.city || 'Not Assigned'}</p>
                            </div>
                            <div>
                              <span className="text-[10px] font-mono uppercase text-[#858585] block">Enrollment Date</span>
                              <p className="font-mono text-[#F5F5F5] mt-0.5">
                                {bio.enrollmentDate ? new Date(bio.enrollmentDate).toLocaleDateString() : 'Not Enrolled'}
                              </p>
                            </div>
                            <div>
                              <span className="text-[10px] font-mono uppercase text-[#858585] block">Verified Device Sync</span>
                              <p className="font-mono text-[#F5F5F5] mt-0.5">
                                {bio.lastSyncAt ? new Date(bio.lastSyncAt).toLocaleString() : 'Not verified yet'}
                              </p>
                            </div>
                            {bio.lastAcknowledgedAt && !bio.lastSyncAt && (
                              <div>
                                <span className="text-[10px] font-mono uppercase text-[#858585] block">Device Command Acknowledged</span>
                                <p className="font-mono text-[#B8B8B8] mt-0.5">
                                  {new Date(bio.lastAcknowledgedAt).toLocaleString()} (unverified)
                                </p>
                              </div>
                            )}
                            <div>
                              <span className="text-[10px] font-mono uppercase text-[#858585] block">Last Attendance Punch</span>
                              <p className="font-mono text-[#F5F5F5] mt-0.5">
                                {bio.lastPunchAt ? new Date(bio.lastPunchAt).toLocaleString() : 'No Records'}
                              </p>
                            </div>
                            <div>
                              <span className="text-[10px] font-mono uppercase text-[#858585] block">Last Punch Result</span>
                              <p className="font-mono text-[#F5F5F5] mt-0.5">
                                {bio.lastPunchResult ? bio.lastPunchResult.replace(/_/g, ' ') : 'No Records'}
                              </p>
                            </div>
                          </div>

                          {/* Conditional Admin Actions */}
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-[#252525]">
                            {(bio.eligibleToEnroll || bio.rawEnrollmentStatus === 'AWAITING_PHYSICAL_ENROLLMENT') && (
                              <button
                                type="button"
                                disabled={bioActionLoading}
                                onClick={handleEnrollBiometric}
                                className="px-3 py-1.5 rounded-lg bg-[#F03B2E] hover:bg-[#FF493B] text-white text-[11px] font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
                              >
                                {bio.rawEnrollmentStatus === 'AWAITING_PHYSICAL_ENROLLMENT'
                                  ? 'Complete Physical Enrollment'
                                  : 'Enroll Member'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={handleToggleBiometricLogs}
                              className="px-3 py-1.5 rounded-lg bg-[#202020] hover:bg-[#303030] border border-[#303030] text-[#F5F5F5] text-[11px] font-bold uppercase tracking-wider cursor-pointer"
                            >
                              {bioLogsOpen ? 'Hide Biometric Logs' : 'View Biometric Logs'}
                            </button>
                            {bio.canRetrySync && (
                              <button
                                type="button"
                                disabled={bioActionLoading}
                                onClick={handleRetryBiometricSync}
                                className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
                              >
                                Retry Sync
                              </button>
                            )}
                            {bio.canDisableAccess && (
                              <button
                                type="button"
                                disabled={bioActionLoading}
                                onClick={handleDisableBiometric}
                                className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
                              >
                                Disable Biometric Access
                              </button>
                            )}
                          </div>

                          {/* On-Demand Biometric Logs Drawer */}
                          {bioLogsOpen && (
                            <div className="mt-2 p-3 rounded-lg bg-[#111111] border border-[#252525] space-y-2 text-xs">
                              {bioLogsLoading ? (
                                <p className="text-[#858585] font-mono">Loading biometric logs...</p>
                              ) : bioLogsError ? (
                                <p className="text-rose-400">{bioLogsError}</p>
                              ) : (
                                <>
                                  {(!bioLogsData?.enrollmentHistory?.length && !bioLogsData?.deviceLogs?.length && !bioLogsData?.biometricAttendances?.length) ? (
                                    <p className="text-[#858585]">No biometric logs recorded for this member.</p>
                                  ) : (
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                      {(bioLogsData?.enrollmentHistory || []).map((ev, idx) => (
                                        <div key={`eh-${idx}`} className="flex items-start justify-between gap-2 border-b border-[#1E1E1E] pb-1">
                                          <div>
                                            <span className="font-mono text-[10px] text-[#F03B2E] uppercase">{ev.action}</span>
                                            {ev.note && <p className="text-[11px] text-[#B8B8B8]">{ev.note}</p>}
                                          </div>
                                          <span className="font-mono text-[10px] text-[#858585] shrink-0">
                                            {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : ''}
                                          </span>
                                        </div>
                                      ))}
                                      {(bioLogsData?.deviceLogs || []).map((dl) => (
                                        <div key={dl._id} className="flex items-start justify-between gap-2 border-b border-[#1E1E1E] pb-1">
                                          <div>
                                            <span className="font-mono text-[10px] text-amber-400 uppercase">{dl.action || dl.category}</span>
                                            <p className="text-[11px] text-[#B8B8B8]">{dl.message}</p>
                                          </div>
                                          <span className="font-mono text-[10px] text-[#858585] shrink-0">
                                            {new Date(dl.createdAt).toLocaleString()}
                                          </span>
                                        </div>
                                      ))}
                                      {(bioLogsData?.biometricAttendances || []).map((att) => (
                                        <div key={att._id} className="flex items-start justify-between gap-2 border-b border-[#1E1E1E] pb-1">
                                          <div>
                                            <span className="font-mono text-[10px] text-emerald-400 uppercase">BIOMETRIC PUNCH ({att.attendanceStatus})</span>
                                            <p className="text-[11px] text-[#B8B8B8]">PIN {att.biometricUserId || '—'}</p>
                                          </div>
                                          <span className="font-mono text-[10px] text-[#858585] shrink-0">
                                            {new Date(att.checkInTime || att.date).toLocaleString()}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </section>

                  {/* 6. Attendance History */}
                  <section
                    ref={attendanceSectionRef}
                    className="bg-[#181818] border border-[#303030] rounded-xl p-4 space-y-2.5"
                  >
                    <span className="text-[11px] font-mono uppercase text-[#F03B2E] font-bold block">
                      6. Attendance History
                    </span>
                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                      {clientDetailData.attendances?.length > 0 ? (
                        clientDetailData.attendances.map((a) => (
                          <span
                            key={a._id}
                            className="px-2.5 py-1 bg-[#111111] border border-[#303030] rounded text-[11px] font-mono text-[#F5F5F5]"
                          >
                            {new Date(a.date).toLocaleDateString()} •{' '}
                            {new Date(a.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-[#B8B8B8] italic">No attendance visits recorded.</span>
                      )}
                    </div>
                  </section>

                  {/* 6. Invoices & Payment History */}
                  <section
                    ref={paymentSectionRef}
                    className="bg-[#181818] border border-[#303030] rounded-xl p-4 space-y-3"
                  >
                    <span className="text-[11px] font-mono uppercase text-[#F03B2E] font-bold block">
                      6. Invoices &amp; Payment History
                    </span>

                    {/* Outstanding & Past Invoices */}
                    {invoicesLoading ? (
                      <p className="text-xs text-[#858585]">Loading invoices...</p>
                    ) : clientInvoices.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono uppercase text-[#858585] block">Invoices</span>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {clientInvoices.map((inv) => {
                            const hasBalance = (inv.balanceAmount || 0) > 0 && inv.status !== 'PAID' && inv.status !== 'CANCELLED';
                            return (
                              <div
                                key={inv._id}
                                className="p-2.5 rounded-lg bg-[#111111] border border-[#252525] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono font-bold text-[#F5F5F5]">{inv.invoiceNumber}</span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
                                        inv.status === 'PAID'
                                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                          : inv.status === 'PARTIALLY_PAID'
                                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                          : 'bg-[#F03B2E]/10 text-[#FF493B] border-[#F03B2E]/30'
                                      }`}
                                    >
                                      {inv.status}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-[#858585] font-mono block mt-0.5">
                                    Total: ₹{inv.totalAmount} • Paid: ₹{inv.paidAmount || 0}
                                    {hasBalance && <strong className="text-amber-400"> • Balance: ₹{inv.balanceAmount}</strong>}
                                  </span>
                                </div>
                                {hasBalance && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRecordPayment(inv)}
                                    className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#F03B2E] hover:bg-[#FF493B] text-white text-[11px] font-bold uppercase tracking-wider cursor-pointer shrink-0"
                                  >
                                    Record Payment
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <span className="text-[10px] font-mono uppercase text-[#858585] block pt-1">Payment Ledger</span>
                    {clientDetailData.payments?.length > 0 ? (
                      <>
                        {/* Desktop Ledger Table */}
                        <div className="hidden sm:block bg-[#111111] border border-[#252525] rounded-lg overflow-hidden max-h-44 overflow-y-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-[#303030] bg-[#181818] text-[10px] text-[#B8B8B8]">
                                <th className="p-2 font-mono">Date</th>
                                <th className="p-2 font-mono">Tx ID</th>
                                <th className="p-2 font-mono">Amount</th>
                                <th className="p-2 font-mono">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#202020]">
                              {clientDetailData.payments.map((p) => (
                                <tr key={p._id}>
                                  <td className="p-2 font-mono">{new Date(p.date).toLocaleDateString()}</td>
                                  <td className="p-2 font-mono truncate max-w-[120px]">{p.transactionId}</td>
                                  <td className="p-2 font-bold text-[#F03B2E]">₹{p.amount}</td>
                                  <td className="p-2">
                                    <span className="text-[10px] font-bold text-emerald-400">{p.status}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {/* Mobile Payment List */}
                        <div className="sm:hidden space-y-2 max-h-48 overflow-y-auto">
                          {clientDetailData.payments.map((p) => (
                            <div
                              key={p._id}
                              className="p-2.5 rounded-lg bg-[#111111] border border-[#252525] flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="min-w-0">
                                <span className="font-mono text-[#F5F5F5] block">
                                  {new Date(p.date).toLocaleDateString()}
                                </span>
                                <span className="text-[10px] font-mono text-[#858585] truncate block">
                                  {p.transactionId}
                                </span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-bold text-[#F03B2E] block">₹{p.amount}</span>
                                <span className="text-[10px] font-bold text-emerald-400">{p.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-[#B8B8B8] italic">No payment transactions recorded.</p>
                    )}
                  </section>
                </>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="px-5 py-3.5 border-t border-[#252525] bg-[#111111] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedClientId(null);
                  setClientDetailData(null);
                }}
                className="min-h-[44px] px-4 py-2 rounded-lg bg-[#202020] hover:bg-[#303030] border border-[#303030] text-xs font-bold uppercase text-[#F5F5F5] cursor-pointer w-full sm:w-auto"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ASSIGN / CHANGE TRAINER MODAL ── */}
      {isTrainerModalOpen && trainerModalClient && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Assign trainer for ${trainerModalClient.name}`}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setIsTrainerModalOpen(false)}
        >
          <div
            className="bg-[#181818] border-t sm:border border-[#303030] rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl pb-[env(safe-area-inset-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#252525] flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <span className="font-label text-[#F03B2E] block">COACH ASSIGNMENT</span>
                <h3 className="mm-page-title text-lg sm:text-xl truncate">{trainerModalClient.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTrainerModalOpen(false)}
                aria-label="Close modal"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#202020] text-[#B8B8B8] hover:text-white border border-[#303030] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmTrainerModal} className="flex flex-col flex-1 min-h-0">
              <div className="p-5 overflow-y-auto overscroll-contain space-y-4">
                {trainerAssignError && (
                  <div className="p-3 rounded-lg bg-[#F03B2E]/10 border border-[#F03B2E] text-xs text-[#F5F5F5]">
                    {trainerAssignError}
                  </div>
                )}

                <div className="p-3 rounded-lg bg-[#111111] border border-[#252525] text-xs flex items-center gap-3">
                  {trainerModalClient.trainer && (
                    <TrainerAvatar trainer={trainerModalClient.trainer} size="sm" rounded="rounded-lg" />
                  )}
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#858585] block">Current Trainer</span>
                    <span className="font-bold text-[#F5F5F5] mt-0.5 block">
                      {trainerModalClient.trainer?.name || 'No Trainer Assigned'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">
                    Select Active Trainer ({trainerModalClient.branch?.city || 'Branch'})
                  </label>
                  <select
                    value={selectedTrainerId}
                    onChange={(e) => setSelectedTrainerId(e.target.value)}
                    className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                  >
                    <option value="">No Trainer Assigned (Self-Managed)</option>
                    {activeTrainers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {t.branch?.city || 'HQ'} ({t.specialization})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-[#252525] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsTrainerModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold uppercase bg-[#202020] text-[#B8B8B8] cursor-pointer w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigningTrainer}
                  className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold uppercase bg-[#F03B2E] hover:bg-[#FF493B] text-white cursor-pointer w-full sm:w-auto"
                >
                  {assigningTrainer ? 'Saving...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT CLIENT MODAL ── */}
      {isEditModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit Client Profile"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="bg-[#181818] border-t sm:border border-[#303030] rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl pb-[env(safe-area-inset-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#252525] flex items-center justify-between shrink-0">
              <div>
                <span className="font-label text-[#F03B2E] block">UPDATE ATHLETE</span>
                <h3 className="mm-page-title text-lg sm:text-xl">EDIT CLIENT DETAILS</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                aria-label="Close edit modal"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#202020] text-[#B8B8B8] hover:text-white border border-[#303030] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 min-h-0">
              <div className="p-5 overflow-y-auto overscroll-contain space-y-3 flex-1">
                {editError && (
                  <div className="p-3 rounded-lg bg-[#F03B2E]/10 border border-[#F03B2E] text-xs text-[#F5F5F5]">
                    {editError}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Email (Optional)</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Phone (Optional)</label>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Gender</label>
                    <select
                      value={editForm.gender}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                      className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                    >
                      <option value="">Not specified</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Age (Optional)</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={editForm.age}
                      onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                      className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none font-mono"
                      placeholder="e.g. 26"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={editForm.dateOfBirth}
                      onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                      className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Address</label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    value={editForm.emergencyContact}
                    onChange={(e) => setEditForm({ ...editForm, emergencyContact: e.target.value })}
                    className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Branch</label>
                  <select
                    value={editForm.branchId}
                    onChange={(e) => setEditForm({ ...editForm, branchId: e.target.value })}
                    className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                  >
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.city} Branch
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Fitness Goal</label>
                    <select
                      value={editForm.fitnessGoal}
                      onChange={(e) => setEditForm({ ...editForm, fitnessGoal: e.target.value })}
                      className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
                    >
                      <option value="Muscle Building">Muscle Building</option>
                      <option value="Weight Loss">Weight Loss</option>
                      <option value="Strength Training">Strength Training</option>
                      <option value="General Fitness">General Fitness</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Experience</label>
                    <select
                      value={editForm.experienceLevel}
                      onChange={(e) => setEditForm({ ...editForm, experienceLevel: e.target.value })}
                      className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5]"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Notes</label>
                  <textarea
                    rows={2}
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                    placeholder="Medical notes, walk-in remarks..."
                  />
                </div>
              </div>

              <div className="px-5 py-4 border-t border-[#252525] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold uppercase bg-[#202020] text-[#B8B8B8] cursor-pointer w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold uppercase bg-[#F03B2E] hover:bg-[#FF493B] text-white cursor-pointer w-full sm:w-auto"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD CLIENT MODAL ── */}
      {isAddModalOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add New Client"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="bg-[#181818] border-t sm:border border-[#303030] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl pb-[env(safe-area-inset-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#252525] flex items-center justify-between shrink-0">
              <div>
                <span className="font-label text-[#F03B2E] block">NEW REGISTRATION</span>
                <h3 className="mm-page-title text-lg sm:text-xl">
                  {newlyCreatedClient ? 'CLIENT REGISTERED' : 'ADD NEW CLIENT'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close modal"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#202020] text-[#B8B8B8] hover:text-white border border-[#303030] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {newlyCreatedClient ? (
              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Registration Complete</span>
                    </div>
                    {newlyCreatedClient.clientId && (
                      <span className="px-2.5 py-0.5 rounded bg-[#111111] border border-emerald-500/30 font-mono text-xs font-bold text-emerald-300">
                        {newlyCreatedClient.clientId}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-[#F5F5F5]">{newlyCreatedClient.name}</p>
                  <p className="text-xs text-[#B8B8B8]">
                    Branch: {newlyCreatedClient.branch?.city || 'Selected Branch'} •{' '}
                    Access: {newlyCreatedClient.accountAccessStatus === 'NOT_CREATED' ? 'Walk-in (No Login)' : 'Invitation Pending'}
                  </p>
                </div>

                {newlyCreatedClient.membership ? (
                  <div className="p-4 rounded-xl bg-[#111111] border border-[#303030] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono uppercase text-[#858585]">Membership Plan</span>
                      <span className="font-bold text-[#F5F5F5]">{newlyCreatedClient.membership.planName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono uppercase text-[#858585]">Validity</span>
                      <span className="font-mono text-[#B8B8B8]">
                        {new Date(newlyCreatedClient.membership.startDate).toLocaleDateString()} →{' '}
                        {new Date(newlyCreatedClient.membership.expiryDate).toLocaleDateString()}
                      </span>
                    </div>
                    {newlyCreatedClient.invoice && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="font-mono uppercase text-[#858585]">Invoice / Status</span>
                          <span className="font-mono text-[#F5F5F5]">
                            {newlyCreatedClient.invoice.invoiceNumber} ({newlyCreatedClient.invoice.status})
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono uppercase text-[#858585]">Paid / Balance</span>
                          <span className="font-mono">
                            <span className="text-emerald-400">₹{newlyCreatedClient.invoice.paidAmount || 0}</span>
                            {' / '}
                            <span className={(newlyCreatedClient.invoice.balanceAmount || 0) > 0 ? 'text-amber-400' : 'text-[#858585]'}>
                              ₹{newlyCreatedClient.invoice.balanceAmount || 0}
                            </span>
                          </span>
                        </div>
                      </>
                    )}
                    {newlyCreatedClient.payment?.receiptNumber && (
                      <div className="flex items-center justify-between pt-1 border-t border-[#252525]">
                        <span className="font-mono uppercase text-[#858585]">Receipt No.</span>
                        <span className="font-mono font-bold text-emerald-400">{newlyCreatedClient.payment.receiptNumber}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[#B8B8B8]">
                    Would you like to assign a membership plan and record payment now, or finish without a membership?
                  </p>
                )}

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                  {newlyCreatedClient.payment && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = newlyCreatedClient;
                        setIsAddModalOpen(false);
                        handleOpenClientDetails(target.id);
                      }}
                      className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#202020] hover:bg-[#303030] border border-[#303030] text-[#F5F5F5] cursor-pointer w-full sm:w-auto"
                    >
                      View Client & Receipt
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#202020] hover:bg-[#303030] text-[#B8B8B8] cursor-pointer w-full sm:w-auto"
                  >
                    {newlyCreatedClient.membership ? 'Done' : 'Done (No Membership Yet)'}
                  </button>
                  {!newlyCreatedClient.membership && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = newlyCreatedClient;
                        setIsAddModalOpen(false);
                        handleOpenAssignMembershipModal(target);
                      }}
                      className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#F03B2E] hover:bg-[#FF493B] text-white cursor-pointer w-full sm:w-auto"
                    >
                      Assign Membership
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateClientSubmit} className="flex flex-col flex-1 min-h-0">
                <div className="p-5 overflow-y-auto overscroll-contain space-y-3.5 flex-1">
                  {addError && (
                    <div className="p-3 rounded-lg bg-[#F03B2E]/10 border border-[#F03B2E] text-xs text-[#F5F5F5] space-y-2">
                      <p>{addError}</p>
                      {addDuplicateClient && (
                        <div className="p-2.5 rounded-lg bg-[#111111] border border-[#303030] flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-[#F5F5F5] truncate">{addDuplicateClient.name}</p>
                            <p className="text-[11px] font-mono text-[#B8B8B8] truncate">
                              {addDuplicateClient.phone || 'No phone'} • {addDuplicateClient.email || 'No email'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const existingId = addDuplicateClient.id;
                              setIsAddModalOpen(false);
                              handleOpenClientDetails(existingId);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-[#202020] hover:bg-[#303030] border border-[#303030] text-[11px] font-bold uppercase text-[#F5F5F5] cursor-pointer shrink-0"
                          >
                            View Existing
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={addForm.name}
                      onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                      className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                      placeholder="e.g. S. Karthik"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Phone (Optional)</label>
                      <input
                        type="tel"
                        inputMode="tel"
                        value={addForm.phone}
                        onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                        className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                        placeholder="9876543210"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">
                        Email {addForm.createLoginAccess ? '*' : '(Optional)'}
                      </label>
                      <input
                        type="email"
                        required={addForm.createLoginAccess}
                        value={addForm.email}
                        onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                        className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                        placeholder="karthik@domain.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Branch *</label>
                      <select
                        required
                        value={addForm.branchId}
                        onChange={(e) => setAddForm({ ...addForm, branchId: e.target.value })}
                        className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                      >
                        {branches.map((b) => (
                          <option key={b._id} value={b._id}>
                            {b.city}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Registration Date</label>
                      <input
                        type="date"
                        value={addForm.registrationDate}
                        onChange={(e) => setAddForm({ ...addForm, registrationDate: e.target.value })}
                        className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Gender (Optional)</label>
                      <select
                        value={addForm.gender}
                        onChange={(e) => setAddForm({ ...addForm, gender: e.target.value })}
                        className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                      >
                        <option value="">Prefer not to say</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Age (Optional)</label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={addForm.age}
                        onChange={(e) => setAddForm({ ...addForm, age: e.target.value })}
                        className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none font-mono"
                        placeholder="e.g. 26"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Date of Birth (Optional)</label>
                      <input
                        type="date"
                        value={addForm.dateOfBirth}
                        onChange={(e) => setAddForm({ ...addForm, dateOfBirth: e.target.value })}
                        className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Address (Optional)</label>
                    <input
                      type="text"
                      value={addForm.address}
                      onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                      className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                      placeholder="Street, area, city"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Emergency Contact (Optional)</label>
                      <input
                        type="text"
                        value={addForm.emergencyContact}
                        onChange={(e) => setAddForm({ ...addForm, emergencyContact: e.target.value })}
                        className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                        placeholder="Name / Phone"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Fitness Goal</label>
                      <select
                        value={addForm.fitnessGoal}
                        onChange={(e) => setAddForm({ ...addForm, fitnessGoal: e.target.value })}
                        className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                      >
                        <option value="General Fitness">General Fitness</option>
                        <option value="Muscle Building">Muscle Building</option>
                        <option value="Weight Loss">Weight Loss</option>
                        <option value="Strength Training">Strength Training</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">
                        Assign Coach (Optional)
                      </label>
                      <select
                        value={addForm.trainerId}
                        onChange={(e) => setAddForm({ ...addForm, trainerId: e.target.value })}
                        className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                      >
                        <option value="">None (No Trainer Assigned)</option>
                        {activeTrainers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.branch?.city})
                          </option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 min-h-[44px] px-3 rounded-xl bg-[#111111] border border-[#303030] text-xs text-[#F5F5F5] cursor-pointer self-end">
                      <input
                        type="checkbox"
                        checked={addForm.createLoginAccess}
                        onChange={(e) => setAddForm({ ...addForm, createLoginAccess: e.target.checked })}
                      />
                      <span>Create login access (requires email)</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Notes (Optional)</label>
                    <textarea
                      rows={2}
                      value={addForm.notes}
                      onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                      className="w-full bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                      placeholder="Walk-in remarks, medical notes, preferences..."
                    />
                  </div>

                  {/* Integrated Membership & Payment Workflow */}
                  <div className="p-3.5 rounded-xl bg-[#111111] border border-[#303030] space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5]">
                        Assign Membership & Record Payment Now
                      </span>
                      <input
                        type="checkbox"
                        checked={addForm.assignMembershipNow}
                        onChange={(e) => setAddForm({ ...addForm, assignMembershipNow: e.target.checked })}
                      />
                    </label>

                    {addForm.assignMembershipNow && (
                      <div className="space-y-3 pt-2 border-t border-[#252525]">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Membership Plan *</label>
                            <select
                              required={addForm.assignMembershipNow}
                              value={addForm.planId}
                              onChange={(e) => {
                                const selected = plans.find((p) => p._id === e.target.value);
                                const price = selected ? getPlanPricingForBranch(selected, addForm.branchId).finalPrice : '';
                                const days = selected ? selected.durationDays || (selected.durationMonths || 1) * 30 : 30;
                                setAddForm({
                                  ...addForm,
                                  planId: e.target.value,
                                  durationDays: days,
                                  amount: price,
                                  paidAmount: addForm.paymentStatus === 'PAID' ? price : addForm.paidAmount,
                                });
                              }}
                              className="w-full min-h-[44px] bg-[#181818] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                            >
                              <option value="">Select Plan</option>
                              {getActivePlansForBranch(addForm.branchId).map((p) => (
                                <option key={p._id} value={p._id}>
                                  {p.name} (₹{getPlanPricingForBranch(p, addForm.branchId).finalPrice})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Start Date</label>
                            <input
                              type="date"
                              value={addForm.startDate}
                              onChange={(e) => setAddForm({ ...addForm, startDate: e.target.value })}
                              className="w-full min-h-[44px] bg-[#181818] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Duration (Days)</label>
                            <input
                              type="number"
                              min="1"
                              value={addForm.durationDays}
                              onChange={(e) => setAddForm({ ...addForm, durationDays: e.target.value })}
                              className="w-full min-h-[44px] bg-[#181818] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Membership Fee (₹)</label>
                            <input
                              type="number"
                              min="0"
                              value={addForm.amount}
                              onChange={(e) => {
                                const fee = e.target.value;
                                setAddForm({
                                  ...addForm,
                                  amount: fee,
                                  paidAmount: addForm.paymentStatus === 'PAID' ? fee : addForm.paidAmount,
                                });
                              }}
                              className="w-full min-h-[44px] bg-[#181818] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Payment Method</label>
                            <select
                              value={addForm.paymentMethod}
                              onChange={(e) => setAddForm({ ...addForm, paymentMethod: e.target.value })}
                              className="w-full min-h-[44px] bg-[#181818] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                            >
                              <option value="CASH">Cash</option>
                              <option value="UPI">UPI</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Payment Status</label>
                            <select
                              value={addForm.paymentStatus}
                              onChange={(e) => {
                                const st = e.target.value;
                                setAddForm({
                                  ...addForm,
                                  paymentStatus: st,
                                  paidAmount: st === 'PAID' ? addForm.amount : st === 'PENDING' ? 0 : addForm.paidAmount,
                                });
                              }}
                              className="w-full min-h-[44px] bg-[#181818] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                            >
                              <option value="PAID">Paid (Full)</option>
                              <option value="PARTIAL">Partial Payment</option>
                              <option value="PENDING">Pending (Pay Later)</option>
                            </select>
                          </div>
                        </div>

                        {addForm.paymentStatus === 'PARTIAL' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                            <div>
                              <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Amount Received (₹)</label>
                              <input
                                type="number"
                                min="0"
                                max={Number(addForm.amount || 0)}
                                value={addForm.paidAmount}
                                onChange={(e) => setAddForm({ ...addForm, paidAmount: e.target.value })}
                                className="w-full min-h-[44px] bg-[#181818] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none font-mono"
                              />
                            </div>
                            <div className="min-h-[44px] px-3 py-2 rounded-xl bg-[#181818] border border-[#303030] flex items-center justify-between text-xs">
                              <span className="text-[#858585] font-mono">Remaining Balance:</span>
                              <span className="font-mono font-bold text-amber-400">
                                ₹{Math.max(0, Number(addForm.amount || 0) - Number(addForm.paidAmount || 0))}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Optional Walk-In Biometric Enrollment */}
                  <div className="bg-[#111111] border border-[#252525] rounded-xl p-4 space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <span className="text-xs font-bold text-[#F5F5F5] block">
                          Queue Biometric Enrollment (Optional)
                        </span>
                        <span className="text-[11px] text-[#858585]">
                          Create an AWAITING_PHYSICAL_ENROLLMENT request on a branch X2008 terminal.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(addForm.biometricEnrollment?.enabled)}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          if (enabled) loadBioEnrollDevices(addForm.branchId);
                          setAddForm((prev) => ({
                            ...prev,
                            biometricEnrollment: {
                              ...(prev.biometricEnrollment || {}),
                              enabled,
                              deviceId: prev.biometricEnrollment?.deviceId || bioEnrollDevices[0]?._id || '',
                            },
                          }));
                        }}
                      />
                    </label>

                    {addForm.biometricEnrollment?.enabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#252525]">
                        <div>
                          <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Biometric Device *</label>
                          <select
                            required
                            value={addForm.biometricEnrollment?.deviceId || ''}
                            onChange={(e) =>
                              setAddForm((prev) => ({
                                ...prev,
                                biometricEnrollment: { ...(prev.biometricEnrollment || {}), deviceId: e.target.value },
                              }))
                            }
                            className="w-full min-h-[44px] bg-[#181818] border border-[#303030] rounded-xl px-3 text-xs text-[#F5F5F5]"
                          >
                            <option value="">Select branch device</option>
                            {bioEnrollDevices.map((d) => (
                              <option key={d._id} value={d._id}>
                                {d.deviceName} ({d.model})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Device PIN (Auto if blank)</label>
                          <input
                            type="text"
                            value={addForm.biometricEnrollment?.biometricUserId || ''}
                            onChange={(e) =>
                              setAddForm((prev) => ({
                                ...prev,
                                biometricEnrollment: { ...(prev.biometricEnrollment || {}), biometricUserId: e.target.value },
                              }))
                            }
                            placeholder="e.g. 1001"
                            className="w-full min-h-[44px] bg-[#181818] border border-[#303030] rounded-xl px-3 text-xs text-[#F5F5F5] font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 py-4 border-t border-[#252525] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0 bg-[#181818]">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#202020] hover:bg-[#303030] text-[#B8B8B8] cursor-pointer w-full sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAdd}
                    className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#F03B2E] hover:bg-[#FF493B] text-white cursor-pointer w-full sm:w-auto"
                  >
                    {submittingAdd ? 'Registering...' : 'Register Client'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ── RESET PASSWORD MODAL ── */}
      {isPasswordModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Reset Client Password"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setIsPasswordModalOpen(false)}
        >
          <div
            className="bg-[#181818] border-t sm:border border-[#303030] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-5 sm:p-6 space-y-4 shadow-2xl pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-label text-[#F03B2E] block mb-0.5">ACCOUNT SECURITY</span>
                <h3 className="mm-page-title text-lg">RESET CLIENT PASSWORD</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setNewPassword('');
                }}
                aria-label="Close modal"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#202020] text-[#B8B8B8] hover:text-white border border-[#303030] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#B8B8B8]">
              Enter a new password (minimum 8 characters) for{' '}
              <strong className="text-[#F5F5F5]">{passwordTargetClient?.name || 'this client'}</strong>.
            </p>

            {passwordError && (
              <div className="p-3 rounded-lg bg-[#F03B2E]/10 border border-[#F03B2E] text-xs text-[#F5F5F5]">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <input
                type="text"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 8 chars)"
                className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
              />

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setNewPassword('');
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold uppercase bg-[#202020] text-[#B8B8B8] cursor-pointer w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold uppercase bg-[#F03B2E] hover:bg-[#FF493B] text-white cursor-pointer w-full sm:w-auto"
                >
                  {savingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ASSIGN MEMBERSHIP MODAL ── */}
      {isAssignModalOpen && (() => {
        const targetBranchId = assignTargetClient?.branch?._id || assignTargetClient?.branch || clientDetailData?.client?.branch?._id || branches[0]?._id;
        const availablePlans = getActivePlansForBranch(targetBranchId);
        const chosenPlan = availablePlans.find((p) => p._id === assignForm.planId) || plans.find((p) => p._id === assignForm.planId);
        const pricing = getPlanPricingForBranch(chosenPlan, targetBranchId);
        const finalFee = assignForm.amount !== '' ? Number(assignForm.amount) : pricing.finalPrice;
        const paidNow = assignForm.paymentStatus === 'FULL'
          ? finalFee
          : assignForm.paymentStatus === 'PARTIAL'
          ? Math.max(0, Number(assignForm.partialAmount || 0))
          : 0;
        const balanceRemaining = Math.max(0, finalFee - paidNow);

        let computedExpiry = '—';
        if (chosenPlan && assignForm.startDate) {
          const d = new Date(assignForm.startDate);
          if (!Number.isNaN(d.getTime())) {
            if (chosenPlan.durationDays) {
              d.setDate(d.getDate() + Number(chosenPlan.durationDays));
            } else if (chosenPlan.durationMonths) {
              d.setMonth(d.getMonth() + Number(chosenPlan.durationMonths));
            }
            computedExpiry = d.toLocaleDateString();
          }
        }

        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Assign Membership Pass"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsAssignModalOpen(false)}
          >
            <div
              className="bg-[#181818] border-t sm:border border-[#303030] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl pb-[env(safe-area-inset-bottom)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-[#252525] flex items-center justify-between shrink-0">
                <div>
                  <span className="font-label text-[#F03B2E] block">MEMBERSHIP PASS</span>
                  <h3 className="mm-page-title text-lg sm:text-xl">ASSIGN MEMBERSHIP</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  aria-label="Close modal"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#202020] text-[#B8B8B8] hover:text-white border border-[#303030] cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAssignMembership} className="flex flex-col flex-1 min-h-0">
                <div className="p-5 overflow-y-auto overscroll-contain space-y-4 flex-1">
                  <div className="p-3 rounded-xl bg-[#111111] border border-[#252525] flex items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#858585] block">Member</span>
                      <strong className="text-[#F5F5F5]">
                        {assignTargetClient?.name || clientDetailData?.client?.name || 'this client'}
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono uppercase text-[#858585] block">Branch</span>
                      <span className="font-mono text-[#F03B2E] font-bold">
                        {assignTargetClient?.branch?.city || branches.find((b) => b._id === targetBranchId)?.city || 'HQ'}
                      </span>
                    </div>
                  </div>

                  {assignError && (
                    <div className="p-3 rounded-lg bg-[#F03B2E]/10 border border-[#F03B2E] text-xs text-[#F5F5F5]">
                      {assignError}
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-mono text-[#B8B8B8] uppercase mb-1">
                      Membership Plan (Active Branch Plans) *
                    </label>
                    <select
                      required
                      value={assignForm.planId}
                      onChange={(e) => {
                        const chosen = availablePlans.find((p) => p._id === e.target.value);
                        const pPricing = getPlanPricingForBranch(chosen, targetBranchId);
                        setAssignForm({
                          ...assignForm,
                          planId: e.target.value,
                          amount: pPricing.finalPrice,
                        });
                      }}
                      className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                    >
                      <option value="">Select a plan</option>
                      {availablePlans.map((p) => {
                        const pPricing = getPlanPricingForBranch(p, targetBranchId);
                        return (
                          <option key={p._id} value={p._id}>
                            {p.name} ({p.durationMonths ? `${p.durationMonths} Mo` : `${p.durationDays} Days`} — ₹{pPricing.finalPrice})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {chosenPlan && (
                    <div className="p-3 rounded-xl bg-[#111111] border border-[#252525] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] font-mono text-[#858585] uppercase block">Base Price</span>
                        <span className="font-mono font-bold text-[#F5F5F5]">₹{pricing.basePrice}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-[#858585] uppercase block">Joining Fee</span>
                        <span className="font-mono text-[#F5F5F5]">₹{pricing.joiningFee}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-[#858585] uppercase block">Discount</span>
                        <span className="font-mono text-emerald-400">-₹{pricing.discount}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-[#858585] uppercase block">Expiry Date</span>
                        <span className="font-mono font-bold text-emerald-400">{computedExpiry}</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-[#B8B8B8] uppercase mb-1">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={assignForm.startDate}
                        onChange={(e) => setAssignForm({ ...assignForm, startDate: e.target.value })}
                        className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-[#B8B8B8] uppercase mb-1">
                        Final Amount (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={assignForm.amount}
                        onChange={(e) => setAssignForm({ ...assignForm, amount: e.target.value })}
                        className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#252525] space-y-3">
                    <span className="text-[11px] font-mono uppercase text-[#F03B2E] font-bold block">
                      PAYMENT &amp; ACTIVATION
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-mono text-[#B8B8B8] uppercase mb-1">
                          Payment Status
                        </label>
                        <select
                          value={assignForm.paymentStatus}
                          onChange={(e) => setAssignForm({ ...assignForm, paymentStatus: e.target.value })}
                          className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                        >
                          <option value="FULL">Full Payment (Activate Now)</option>
                          <option value="PARTIAL">Partial Payment</option>
                          <option value="PENDING">Pending Payment (Pay Later)</option>
                        </select>
                      </div>

                      {assignForm.paymentStatus !== 'PENDING' && (
                        <div>
                          <label className="block text-[11px] font-mono text-[#B8B8B8] uppercase mb-1">
                            Payment Method
                          </label>
                          <select
                            value={assignForm.paymentMethod}
                            onChange={(e) => setAssignForm({ ...assignForm, paymentMethod: e.target.value })}
                            className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                          >
                            <option value="CASH">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="CARD">Card</option>
                            <option value="BANK_TRANSFER">Bank Transfer</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {assignForm.paymentStatus === 'PARTIAL' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-mono text-[#B8B8B8] uppercase mb-1">
                            Amount Received Now (₹) *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max={finalFee}
                            required
                            value={assignForm.partialAmount || ''}
                            onChange={(e) => setAssignForm({ ...assignForm, partialAmount: e.target.value })}
                            className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none font-mono"
                            placeholder="e.g. 1000"
                          />
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#111111] border border-[#252525] flex flex-col justify-center">
                          <span className="text-[10px] font-mono uppercase text-[#858585]">Outstanding Balance</span>
                          <span className="text-sm font-mono font-bold text-amber-400">₹{balanceRemaining}</span>
                        </div>
                      </div>
                    )}

                    {assignForm.paymentStatus !== 'PENDING' && (
                      <div>
                        <label className="block text-[11px] font-mono text-[#B8B8B8] uppercase mb-1">
                          Reference / Transaction ID (Optional)
                        </label>
                        <input
                          type="text"
                          value={assignForm.referenceNumber}
                          onChange={(e) => setAssignForm({ ...assignForm, referenceNumber: e.target.value })}
                          className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none font-mono"
                          placeholder="UPI Ref / Receipt #"
                        />
                      </div>
                    )}

                    {assignForm.paymentStatus === 'PENDING' && (
                      <p className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-lg p-2.5">
                        Membership will be created as <strong>PENDING_PAYMENT</strong> with ₹{finalFee} due. No fake payment will be recorded.
                      </p>
                    )}
                  </div>

                  {/* Optional Walk-In Biometric Enrollment */}
                  <div className="bg-[#111111] border border-[#252525] rounded-xl p-4 space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <span className="text-xs font-bold text-[#F5F5F5] block">
                          Queue Biometric Enrollment (Optional)
                        </span>
                        <span className="text-[11px] text-[#858585]">
                          Create an AWAITING_PHYSICAL_ENROLLMENT request on a branch X2008 terminal.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(addForm.biometricEnrollment?.enabled)}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          if (enabled) loadBioEnrollDevices(addForm.branchId);
                          setAddForm((prev) => ({
                            ...prev,
                            biometricEnrollment: {
                              ...(prev.biometricEnrollment || {}),
                              enabled,
                              deviceId: prev.biometricEnrollment?.deviceId || bioEnrollDevices[0]?._id || '',
                            },
                          }));
                        }}
                      />
                    </label>

                    {addForm.biometricEnrollment?.enabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#252525]">
                        <div>
                          <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Biometric Device *</label>
                          <select
                            required
                            value={addForm.biometricEnrollment?.deviceId || ''}
                            onChange={(e) =>
                              setAddForm((prev) => ({
                                ...prev,
                                biometricEnrollment: { ...(prev.biometricEnrollment || {}), deviceId: e.target.value },
                              }))
                            }
                            className="w-full min-h-[44px] bg-[#181818] border border-[#303030] rounded-xl px-3 text-xs text-[#F5F5F5]"
                          >
                            <option value="">Select branch device</option>
                            {bioEnrollDevices.map((d) => (
                              <option key={d._id} value={d._id}>
                                {d.deviceName} ({d.model})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-mono uppercase text-[#B8B8B8] mb-1">Device PIN (Auto if blank)</label>
                          <input
                            type="text"
                            value={addForm.biometricEnrollment?.biometricUserId || ''}
                            onChange={(e) =>
                              setAddForm((prev) => ({
                                ...prev,
                                biometricEnrollment: { ...(prev.biometricEnrollment || {}), biometricUserId: e.target.value },
                              }))
                            }
                            placeholder="e.g. 1001"
                            className="w-full min-h-[44px] bg-[#181818] border border-[#303030] rounded-xl px-3 text-xs text-[#F5F5F5] font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 py-4 border-t border-[#252525] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={assignLoading}
                    onClick={() => setIsAssignModalOpen(false)}
                    className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#202020] hover:bg-[#2c2c2c] text-[#B8B8B8] transition-colors cursor-pointer w-full sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assignLoading}
                    className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#F03B2E] hover:bg-[#FF493B] text-white font-semibold transition-all cursor-pointer w-full sm:w-auto"
                  >
                    {assignLoading ? 'Saving...' : assignForm.paymentStatus === 'PENDING' ? 'Create Pending Pass' : 'Record & Assign'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ── RECORD PAYMENT MODAL ── */}
      {isRecordPaymentOpen && recordPaymentInvoice && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Record Invoice Payment"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setIsRecordPaymentOpen(false)}
        >
          <div
            className="bg-[#181818] border-t sm:border border-[#303030] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl pb-[env(safe-area-inset-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#252525] flex items-center justify-between shrink-0">
              <div>
                <span className="font-label text-[#F03B2E] block">INVOICE SETTLEMENT</span>
                <h3 className="mm-page-title text-lg sm:text-xl">RECORD PAYMENT</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRecordPaymentOpen(false)}
                aria-label="Close modal"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#202020] text-[#B8B8B8] hover:text-white border border-[#303030] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRecordPayment} className="flex flex-col flex-1 min-h-0">
              <div className="p-5 overflow-y-auto overscroll-contain space-y-3.5 flex-1">
                <div className="p-3 rounded-xl bg-[#111111] border border-[#252525] text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#858585] font-mono">Invoice</span>
                    <span className="font-mono font-bold text-[#F5F5F5]">{recordPaymentInvoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#858585] font-mono">Balance Due</span>
                    <span className="font-mono font-bold text-amber-400">₹{recordPaymentInvoice.balanceAmount}</span>
                  </div>
                </div>

                {recordPaymentError && (
                  <div className="p-3 rounded-lg bg-[#F03B2E]/10 border border-[#F03B2E] text-xs text-[#F5F5F5]">
                    {recordPaymentError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-[#B8B8B8] uppercase mb-1">Amount (₹) *</label>
                    <input
                      type="number"
                      min="1"
                      max={recordPaymentInvoice.balanceAmount}
                      required
                      value={recordPaymentForm.amount}
                      onChange={(e) => setRecordPaymentForm({ ...recordPaymentForm, amount: e.target.value })}
                      className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-[#B8B8B8] uppercase mb-1">Method *</label>
                    <select
                      value={recordPaymentForm.paymentMethod}
                      onChange={(e) => setRecordPaymentForm({ ...recordPaymentForm, paymentMethod: e.target.value })}
                      className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                    >
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="CARD">Card</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-[#B8B8B8] uppercase mb-1">Payment Date</label>
                    <input
                      type="date"
                      value={recordPaymentForm.paymentDate}
                      onChange={(e) => setRecordPaymentForm({ ...recordPaymentForm, paymentDate: e.target.value })}
                      className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-[#B8B8B8] uppercase mb-1">Reference #</label>
                    <input
                      type="text"
                      value={recordPaymentForm.referenceNumber}
                      onChange={(e) => setRecordPaymentForm({ ...recordPaymentForm, referenceNumber: e.target.value })}
                      className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none font-mono"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#B8B8B8] uppercase mb-1">Notes</label>
                  <input
                    type="text"
                    value={recordPaymentForm.notes}
                    onChange={(e) => setRecordPaymentForm({ ...recordPaymentForm, notes: e.target.value })}
                    className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#F03B2E] focus:outline-none"
                    placeholder="Optional payment note"
                  />
                </div>
              </div>

              <div className="px-5 py-4 border-t border-[#252525] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  disabled={recordPaymentLoading}
                  onClick={() => setIsRecordPaymentOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold uppercase bg-[#202020] text-[#B8B8B8] cursor-pointer w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordPaymentLoading}
                  className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold uppercase bg-[#F03B2E] hover:bg-[#FF493B] text-white cursor-pointer w-full sm:w-auto"
                >
                  {recordPaymentLoading ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PHYSICAL BIOMETRIC ENROLLMENT MODAL ── */}
      {isBioEnrollModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => !bioEnrollBusy && setIsBioEnrollModalOpen(false)}
        >
          <div
            className="bg-[#181818] border-t sm:border border-[#303030] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90dvh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#252525] flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#F03B2E] font-bold block">
                  PHYSICAL TERMINAL ENROLLMENT
                </span>
                <h3 className="mm-page-title text-lg">
                  {clientDetailData?.client?.name || 'Member'}
                </h3>
              </div>
              <button
                type="button"
                disabled={bioEnrollBusy}
                onClick={() => setIsBioEnrollModalOpen(false)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-[#202020] text-[#F5F5F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePhysicalEnrollmentRequest} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {bioEnrollError && (
                <div className="p-3 rounded-lg bg-[#F03B2E]/10 border border-[#F03B2E] text-[#FF6A5E]">
                  {bioEnrollError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Branch *</label>
                  <select
                    required
                    disabled={Boolean(bioEnrollRequest)}
                    value={bioEnrollForm.branchId}
                    onChange={(e) => {
                      const nextBranch = e.target.value;
                      setBioEnrollForm((prev) => ({ ...prev, branchId: nextBranch, deviceId: '' }));
                      loadBioEnrollDevices(nextBranch);
                    }}
                    className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 text-[#F5F5F5] disabled:opacity-60"
                  >
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>{b.city || b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Registered Device *</label>
                  <select
                    required
                    disabled={Boolean(bioEnrollRequest)}
                    value={bioEnrollForm.deviceId}
                    onChange={(e) => setBioEnrollForm((prev) => ({ ...prev, deviceId: e.target.value }))}
                    className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 text-[#F5F5F5] disabled:opacity-60"
                  >
                    <option value="">Select biometric device</option>
                    {bioEnrollDevices.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.deviceName} ({d.model} • {d.serialNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">
                    Device User ID (Auto if blank)
                  </label>
                  <input
                    type="text"
                    value={bioEnrollForm.biometricUserId}
                    onChange={(e) => setBioEnrollForm((prev) => ({ ...prev, biometricUserId: e.target.value }))}
                    placeholder="e.g. 1001"
                    className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 text-[#F5F5F5] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#B8B8B8] mb-1">Capture Type</label>
                  <select
                    value={bioEnrollForm.captureType}
                    onChange={(e) => setBioEnrollForm((prev) => ({ ...prev, captureType: e.target.value }))}
                    className="w-full min-h-[44px] bg-[#111111] border border-[#303030] rounded-xl px-3 text-[#F5F5F5]"
                  >
                    <option value="FACE">Face (X2008)</option>
                    <option value="FINGERPRINT">Fingerprint</option>
                    <option value="BOTH">Face + Fingerprint</option>
                  </select>
                </div>
              </div>

              {bioEnrollRequest ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-[#F5F5F5]">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-amber-400">
                      STATUS: {bioEnrollRequest.status}
                    </span>
                    <span className="font-mono font-bold text-[#F03B2E]">
                      PIN: {bioEnrollRequest.biometricUserId}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#B8B8B8] leading-relaxed">
                    On the physical eSSL X2008 terminal, open <strong>Menu → User Mgt → New User</strong>, enter User ID{' '}
                    <strong className="font-mono text-white">{bioEnrollRequest.biometricUserId}</strong>, capture the
                    member&apos;s face, and save. Then click <strong>Confirm Physical Enrollment</strong> below.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-[#111111] border border-[#252525] text-[11px] text-[#B8B8B8]">
                  Creates an <strong className="text-white">AWAITING_PHYSICAL_ENROLLMENT</strong> request and reserves a
                  unique Device User ID before you capture the member&apos;s face on the physical X2008.
                </div>
              )}

              <div className="pt-3 border-t border-[#252525] flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  type="button"
                  disabled={bioEnrollBusy}
                  onClick={() => setIsBioEnrollModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#202020] text-[#B8B8B8] font-bold uppercase cursor-pointer"
                >
                  Cancel
                </button>
                {!bioEnrollRequest ? (
                  <button
                    type="submit"
                    disabled={bioEnrollBusy || !bioEnrollForm.deviceId}
                    className="min-h-[44px] px-5 py-2 rounded-xl bg-[#F03B2E] hover:bg-[#FF493B] text-white font-bold uppercase cursor-pointer disabled:opacity-50"
                  >
                    {bioEnrollBusy ? 'Creating Request...' : 'Start Physical Enrollment'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={bioEnrollBusy}
                    onClick={handleConfirmPhysicalEnrollment}
                    className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase cursor-pointer disabled:opacity-50"
                  >
                    {bioEnrollBusy ? 'Confirming...' : 'Confirm Physical Enrollment'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
