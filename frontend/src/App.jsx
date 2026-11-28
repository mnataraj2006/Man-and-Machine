import React, { useState, useEffect, Suspense, lazy } from 'react';
import Header from './components/Navbar/Header.jsx';
import Hero from './components/Hero/Hero.jsx';
import BrandStatement from './components/Editorial/BrandStatement.jsx';
import WhyManAndMachine from './components/Editorial/WhyManAndMachine.jsx';
import ExperienceSection from './components/Editorial/ExperienceSection.jsx';
import Facilities from './components/Facilities/Facilities.jsx';
import MembershipPlansPreview from './components/Membership/MembershipPlansPreview.jsx';
import TrainersSection from './components/Trainer/TrainersSection.jsx';
import CommunitySection from './components/Stats/CommunitySection.jsx';
import GymGallerySection from './components/Editorial/GymGallerySection.jsx';
import FinalCTA from './components/CTA/FinalCTA.jsx';
import Footer from './components/Footer/Footer.jsx';
import JoinModal from './components/Navbar/JoinModal.jsx';
import { WebsiteContentProvider } from './context/WebsiteContentContext.jsx';

const Login = lazy(() => import('./pages/Login.jsx'));
const Signup = lazy(() => import('./pages/Signup.jsx'));
const ActivateAccount = lazy(() => import('./pages/ActivateAccount.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const ClientLayout = lazy(() => import('./components/Client/ClientLayout.jsx'));
const DashboardHome = lazy(() => import('./pages/Client/DashboardHome.jsx'));
const Workouts = lazy(() => import('./pages/Client/Workouts.jsx'));
const WorkoutDetail = lazy(() => import('./pages/Client/WorkoutDetail.jsx'));
const Attendance = lazy(() => import('./pages/Client/Attendance.jsx'));
const Progress = lazy(() => import('./pages/Client/Progress.jsx'));
const Membership = lazy(() => import('./pages/Client/Membership.jsx'));
const Payments = lazy(() => import('./pages/Client/Payments.jsx'));
const Trainer = lazy(() => import('./pages/Client/Trainer.jsx'));
const Notifications = lazy(() => import('./pages/Client/Notifications.jsx'));
const Profile = lazy(() => import('./pages/Client/Profile.jsx'));
const Settings = lazy(() => import('./pages/Client/Settings.jsx'));
const ClientBiometricAccess = lazy(() => import('./pages/Client/BiometricAccess.jsx'));

// Admin Application Suite (lazy-loaded per route)
const AdminLayout = lazy(() => import('./components/Admin/AdminLayout.jsx'));
const AdminDashboardHome = lazy(() => import('./pages/Admin/DashboardHome.jsx'));
const AdminBranches = lazy(() => import('./pages/Admin/Branches.jsx'));
const AdminClients = lazy(() => import('./pages/Admin/Clients.jsx'));
const AdminTrainers = lazy(() => import('./pages/Admin/Trainers.jsx'));
const AdminMembershipPlans = lazy(() => import('./pages/Admin/MembershipPlans.jsx'));
const AdminMemberships = lazy(() => import('./pages/Admin/Memberships.jsx'));
const AdminAttendance = lazy(() => import('./pages/Admin/Attendance.jsx'));
const AdminPayments = lazy(() => import('./pages/Admin/Payments.jsx'));
const AdminNotifications = lazy(() => import('./pages/Admin/Notifications.jsx'));
const AdminSettings = lazy(() => import('./pages/Admin/Settings.jsx'));
const WhatsAppSettings = lazy(() => import('./pages/Admin/WhatsApp.jsx'));
const AdminSmsSettings = lazy(() => import('./pages/Admin/SmsSettings.jsx'));
const AdminFinanceSummary = lazy(() => import('./pages/Admin/Finance/FinanceSummary.jsx'));
const AdminCashApprovals = lazy(() => import('./pages/Admin/Finance/CashApprovals.jsx'));
const AdminWebsiteGallery = lazy(() => import('./pages/Admin/Website/GalleryManager.jsx'));
const AdminWebsiteContent = lazy(() => import('./pages/Admin/Website/ContentManager.jsx'));
const AdminAllInvoices = lazy(() => import('./pages/Admin/Finance/AllInvoices.jsx'));
const AdminTodayInvoices = lazy(() => import('./pages/Admin/Finance/TodayInvoices.jsx'));
const AdminDailyCollections = lazy(() => import('./pages/Admin/Finance/DailyCollections.jsx'));
const AdminMonthlyCollections = lazy(() => import('./pages/Admin/Finance/MonthlyCollections.jsx'));
const AdminExpenses = lazy(() => import('./pages/Admin/Finance/Expenses.jsx'));
const AdminFinanceConfig = lazy(() => import('./pages/Admin/Finance/FinanceConfigPage.jsx'));
const AdminReports = lazy(() => import('./pages/Admin/Reports.jsx'));
const AdminBiometricDevices = lazy(() => import('./pages/Admin/BiometricDevices.jsx'));
const AdminEmployees = lazy(() => import('./pages/Admin/Employees.jsx'));
const AdminEmployeeProfile = lazy(() => import('./pages/Admin/EmployeeProfile.jsx'));

// Trainer Application Suite (lazy-loaded per route)
const TrainerLayout = lazy(() => import('./components/Trainer/TrainerLayout.jsx'));
const TrainerDashboardHome = lazy(() => import('./pages/Trainer/DashboardHome.jsx'));
const TrainerClients = lazy(() => import('./pages/Trainer/Clients.jsx'));
const TrainerClientDetail = lazy(() => import('./pages/Trainer/ClientDetail.jsx'));
const TrainerWorkouts = lazy(() => import('./pages/Trainer/Workouts.jsx'));
const TrainerWorkoutCreate = lazy(() => import('./pages/Trainer/WorkoutCreate.jsx'));
const TrainerSchedule = lazy(() => import('./pages/Trainer/Schedule.jsx'));
const TrainerSessions = lazy(() => import('./pages/Trainer/Sessions.jsx'));
const TrainerProgress = lazy(() => import('./pages/Trainer/Progress.jsx'));
const TrainerAttendance = lazy(() => import('./pages/Trainer/Attendance.jsx'));
const TrainerNotifications = lazy(() => import('./pages/Trainer/Notifications.jsx'));
const TrainerProfile = lazy(() => import('./pages/Trainer/Profile.jsx'));
const TrainerSettings = lazy(() => import('./pages/Trainer/Settings.jsx'));
import authService from './services/auth.js';
import { useTheme } from './context/ThemeContext.jsx';

const RouteFallback = () => (
  <div className="min-h-screen bg-[#090909] p-6 flex flex-col gap-4 animate-pulse">
    <div className="h-10 w-56 bg-[#181818] rounded-xl" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="h-28 bg-[#181818] rounded-2xl" />
      <div className="h-28 bg-[#181818] rounded-2xl" />
      <div className="h-28 bg-[#181818] rounded-2xl" />
      <div className="h-28 bg-[#181818] rounded-2xl" />
    </div>
    <div className="h-64 bg-[#181818] rounded-2xl" />
  </div>
);

export default function App() {
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const { setRoutePath } = useTheme();

  useEffect(() => {
    setRoutePath(currentPath);
  }, [currentPath, setRoutePath]);

  // Route Guard: verify authentication and role permissions
  const checkRoutePermission = (path) => {
    const isAuthed = authService.isAuthenticated();
    const role = authService.getRole();

    // Protected routes requiring authentication
    if (path.startsWith('/client') || path.startsWith('/admin') || path.startsWith('/trainer') || path === '/account') {
      if (!isAuthed) {
        return '/login';
      }

      // Role authorization enforcement
      if (path.startsWith('/admin')) {
        if (role !== 'ADMIN') {
          return authService.getDashboardRoute(role);
        }
      }

      if (path.startsWith('/trainer')) {
        if (role !== 'TRAINER' && role !== 'ADMIN') {
          return authService.getDashboardRoute(role);
        }
      }

      if (path === '/account') {
        return authService.getDashboardRoute(role);
      }
    }

    if (path === '/membership') {
      if (isAuthed && role === 'CLIENT') {
        return '/client/membership';
      }
      return '/';
    }
    return path;
  };

  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const validPath = checkRoutePermission(path);
      if (validPath !== path) {
        window.history.replaceState({}, '', validPath);
        setCurrentPath(validPath);
      } else {
        setCurrentPath(path);
      }
    };

    // Check initial path on load
    const initialPath = window.location.pathname;
    const initialValid = checkRoutePermission(initialPath);
    if (initialValid !== initialPath) {
      window.history.replaceState({}, '', initialValid);
      setCurrentPath(initialValid);
    }

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigate = (path) => {
    const validPath = checkRoutePermission(path);
    if (window.location.pathname !== validPath) {
      window.history.pushState({}, '', validPath);
      setCurrentPath(validPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenJoin = () => navigate('/signup');
  const handleCloseJoin = () => setJoinModalOpen(false);

  // ── ROUTE MATCHERS ──

  // Client Application Area: Unified Layout with Dedicated Pages
  if (currentPath.startsWith('/client') || currentPath === '/account') {
    let clientContent = null;

    if (currentPath === '/client/dashboard' || currentPath === '/client' || currentPath === '/account') {
      clientContent = <DashboardHome onNavigate={navigate} />;
    } else if (currentPath === '/client/workouts') {
      clientContent = <Workouts onNavigate={navigate} />;
    } else if (currentPath.startsWith('/client/workouts/')) {
      const workoutId = currentPath.replace('/client/workouts/', '');
      clientContent = <WorkoutDetail workoutId={workoutId} onNavigate={navigate} />;
    } else if (currentPath === '/client/attendance') {
      clientContent = <Attendance onNavigate={navigate} />;
    } else if (currentPath === '/client/biometric') {
      clientContent = <ClientBiometricAccess onNavigate={navigate} />;
    } else if (currentPath === '/client/progress') {
      clientContent = <Progress onNavigate={navigate} />;
    } else if (currentPath === '/client/membership' || currentPath === '/client/membership/plans') {
      clientContent = <Membership onNavigate={navigate} />;
    } else if (currentPath === '/client/payments') {
      clientContent = <Payments onNavigate={navigate} />;
    } else if (currentPath === '/client/my-trainer' || currentPath === '/client/trainer') {
      clientContent = <Trainer onNavigate={navigate} />;
    } else if (currentPath.startsWith('/client/my-trainer/')) {
      const selectedTrainerId = currentPath.replace('/client/my-trainer/', '');
      clientContent = <Trainer selectedTrainerId={selectedTrainerId} onNavigate={navigate} />;
    } else if (currentPath === '/client/notifications') {
      clientContent = <Notifications onNavigate={navigate} />;
    } else if (currentPath === '/client/profile') {
      clientContent = <Profile onNavigate={navigate} />;
    } else if (currentPath === '/client/settings') {
      clientContent = <Settings onNavigate={navigate} onLogout={() => navigate('/login')} />;
    } else {
      clientContent = <DashboardHome onNavigate={navigate} />;
    }

    return (
      <Suspense fallback={<RouteFallback />}>
        <ClientLayout
          currentPath={currentPath}
          onNavigate={navigate}
          onLogout={() => {
            authService.logout();
            navigate('/login');
          }}
        >
          {clientContent}
        </ClientLayout>
      </Suspense>
    );
  }

  // Admin Application Area: Unified Multi-Branch Admin Suite
  if (currentPath.startsWith('/admin')) {
    let adminContent = null;

    if (currentPath === '/admin/dashboard' || currentPath === '/admin') {
      adminContent = <AdminDashboardHome onNavigate={navigate} />;
    } else if (currentPath === '/admin/branches') {
      adminContent = <AdminBranches onNavigate={navigate} />;
    } else if (currentPath === '/admin/clients' || currentPath.startsWith('/admin/clients/')) {
      adminContent = <AdminClients onNavigate={navigate} />;
    } else if (currentPath === '/admin/trainers' || currentPath.startsWith('/admin/trainers/')) {
      adminContent = <AdminTrainers onNavigate={navigate} />;
    } else if (currentPath === '/admin/employees') {
      adminContent = <AdminEmployees onNavigate={navigate} />;
    } else if (currentPath.startsWith('/admin/employees/')) {
      const empId = currentPath.replace('/admin/employees/', '').split('/')[0];
      adminContent = <AdminEmployeeProfile employeeId={empId} onNavigate={navigate} />;
    } else if (currentPath === '/admin/membership-plans' || currentPath.startsWith('/admin/membership-plans/')) {
      adminContent = <AdminMembershipPlans onNavigate={navigate} />;
    } else if (currentPath === '/admin/memberships') {
      adminContent = <AdminMemberships onNavigate={navigate} />;
    } else if (currentPath === '/admin/attendance') {
      adminContent = <AdminAttendance onNavigate={navigate} />;
    } else if (currentPath === '/admin/biometric' || currentPath.startsWith('/admin/biometric/')) {
      adminContent = <AdminBiometricDevices onNavigate={navigate} />;
    } else if (currentPath === '/admin/payments') {
      adminContent = <AdminPayments onNavigate={navigate} />;
    } else if (currentPath === '/admin/finance' || currentPath === '/admin/finance/summary') {
      adminContent = <AdminFinanceSummary onNavigate={navigate} />;
    } else if (currentPath === '/admin/finance/cash-approvals') {
      adminContent = <AdminCashApprovals onNavigate={navigate} />;
    } else if (currentPath === '/admin/finance/invoices/today') {
      adminContent = <AdminTodayInvoices onNavigate={navigate} />;
    } else if (currentPath === '/admin/finance/invoices') {
      adminContent = <AdminAllInvoices onNavigate={navigate} />;
    } else if (currentPath === '/admin/finance/collections/daily') {
      adminContent = <AdminDailyCollections onNavigate={navigate} />;
    } else if (currentPath === '/admin/finance/collections/monthly') {
      adminContent = <AdminMonthlyCollections onNavigate={navigate} />;
    } else if (currentPath === '/admin/finance/expenses') {
      adminContent = <AdminExpenses onNavigate={navigate} />;
    } else if (currentPath === '/admin/finance/config') {
      adminContent = <AdminFinanceConfig onNavigate={navigate} />;
    } else if (currentPath === '/admin/reports' || currentPath.startsWith('/admin/reports/')) {
      const cat = currentPath.startsWith('/admin/reports/') ? currentPath.replace('/admin/reports/', '').split('/')[0] : null;
      adminContent = <AdminReports initialCategory={cat || null} onNavigate={navigate} />;
    } else if (currentPath === '/admin/notifications') {
      adminContent = <AdminNotifications onNavigate={navigate} />;
    } else if (currentPath === '/admin/website/gallery') {
      adminContent = <AdminWebsiteGallery onNavigate={navigate} />;
    } else if (currentPath === '/admin/website/content') {
      adminContent = <AdminWebsiteContent onNavigate={navigate} />;
    } else if (currentPath === '/admin/settings') {
      adminContent = <AdminSettings onNavigate={navigate} onLogout={() => navigate('/login')} />;
    } else if (currentPath === '/admin/settings/sms' || currentPath === '/admin/settings/communications') {
      adminContent = <AdminSmsSettings onNavigate={navigate} />;
    } else if (currentPath === '/admin/settings/whatsapp') {
      adminContent = <WhatsAppSettings initialTab="connection" />;
    } else if (currentPath === '/admin/settings/whatsapp/templates') {
      adminContent = <WhatsAppSettings initialTab="templates" />;
    } else if (currentPath === '/admin/settings/whatsapp/automation') {
      adminContent = <WhatsAppSettings initialTab="automation" />;
    } else if (currentPath === '/admin/settings/whatsapp/logs' || currentPath === '/admin/whatsapp/logs') {
      adminContent = <WhatsAppSettings initialTab="logs" />;
    } else {
      adminContent = <AdminDashboardHome onNavigate={navigate} />;
    }

    return (
      <Suspense fallback={<RouteFallback />}>
        <AdminLayout
          currentPath={currentPath}
          onNavigate={navigate}
          onLogout={() => {
            authService.logout();
            navigate('/login');
          }}
        >
          {adminContent}
        </AdminLayout>
      </Suspense>
    );
  }

  // Trainer Application Area: Unified Multi-Page Trainer Portal
  if (currentPath.startsWith('/trainer')) {
    let trainerContent = null;

    if (currentPath === '/trainer/dashboard' || currentPath === '/trainer') {
      trainerContent = <TrainerDashboardHome onNavigate={navigate} />;
    } else if (currentPath.startsWith('/trainer/clients/')) {
      const clientId = currentPath.replace('/trainer/clients/', '');
      trainerContent = <TrainerClientDetail clientId={clientId} onNavigate={navigate} />;
    } else if (currentPath === '/trainer/clients') {
      trainerContent = <TrainerClients onNavigate={navigate} />;
    } else if (currentPath === '/trainer/workouts/create') {
      trainerContent = <TrainerWorkoutCreate workoutId="create" onNavigate={navigate} />;
    } else if (currentPath.startsWith('/trainer/workouts/')) {
      const workoutId = currentPath.replace('/trainer/workouts/', '');
      trainerContent = <TrainerWorkoutCreate workoutId={workoutId} onNavigate={navigate} />;
    } else if (currentPath === '/trainer/workouts') {
      trainerContent = <TrainerWorkouts onNavigate={navigate} />;
    } else if (currentPath === '/trainer/schedule') {
      trainerContent = <TrainerSchedule onNavigate={navigate} />;
    } else if (currentPath === '/trainer/sessions') {
      trainerContent = <TrainerSessions onNavigate={navigate} />;
    } else if (currentPath === '/trainer/progress') {
      trainerContent = <TrainerProgress onNavigate={navigate} />;
    } else if (currentPath === '/trainer/attendance') {
      trainerContent = <TrainerAttendance onNavigate={navigate} />;
    } else if (currentPath === '/trainer/notifications') {
      trainerContent = <TrainerNotifications onNavigate={navigate} />;
    } else if (currentPath === '/trainer/profile') {
      trainerContent = <TrainerProfile onNavigate={navigate} />;
    } else if (currentPath === '/trainer/settings') {
      trainerContent = <TrainerSettings onNavigate={navigate} onLogout={() => navigate('/login')} />;
    } else {
      trainerContent = <TrainerDashboardHome onNavigate={navigate} />;
    }

    return (
      <Suspense fallback={<RouteFallback />}>
        <TrainerLayout
          currentPath={currentPath}
          onNavigate={navigate}
          onLogout={() => {
            authService.logout();
            navigate('/login');
          }}
        >
          {trainerContent}
        </TrainerLayout>
      </Suspense>
    );
  }

  // Dedicated Signup & Register routes
  if (currentPath === '/signup' || currentPath === '/register') {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Signup onNavigate={navigate} />
      </Suspense>
    );
  }

  // Dedicated Account Activation route (/activate-account/:token)
  if (currentPath.startsWith('/activate-account/')) {
    const token = currentPath.replace('/activate-account/', '').split('?')[0];
    return (
      <Suspense fallback={<RouteFallback />}>
        <ActivateAccount token={token} onNavigate={navigate} />
      </Suspense>
    );
  }

  // Forgot & Reset Password routes
  if (currentPath === '/forgot-password') {
    return (
      <Suspense fallback={<RouteFallback />}>
        <ForgotPassword onNavigate={navigate} />
      </Suspense>
    );
  }

  if (currentPath.startsWith('/reset-password/')) {
    const token = currentPath.replace('/reset-password/', '').split('?')[0];
    return (
      <Suspense fallback={<RouteFallback />}>
        <ResetPassword token={token} onNavigate={navigate} />
      </Suspense>
    );
  }

  // Dedicated Login page
  if (currentPath === '/login') {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Login onNavigate={navigate} />
      </Suspense>
    );
  }

  return (
    <WebsiteContentProvider>
      <div className="min-h-screen bg-[#090909] text-[#F5F5F5] antialiased selection:bg-[#EB3E2E] selection:text-[#F5F5F5] w-full">
        {/* 01 — Navigation */}
        <Header 
          onOpenJoinModal={handleOpenJoin} 
          onNavigate={navigate}
          currentPath={currentPath}
        />

        {/* Main Content Sections */}
        <main className="w-full bg-[#090909] min-h-screen">
          <div className="flex flex-col w-full text-[#F5F5F5]">
            {/* 02 — Hero */}
            <Hero 
              onOpenJoinModal={handleOpenJoin} 
              onNavigate={navigate}
            />

            {/* 03 — Brand Statement (01 / THE STANDARD) */}
            <BrandStatement />

            {/* 04 — Why Man & Machine (02 / NO SHORTCUTS) */}
            <WhyManAndMachine />

            {/* 05 — Man & Machine Experience (03 / FIND YOUR EDGE) */}
            <ExperienceSection />

            {/* 06 — Training Ground (04 / THE TRAINING GROUND) */}
            <Facilities />

            {/* 07 — Memberships (05 / MAKE THE COMMITMENT) */}
            <MembershipPlansPreview onNavigate={navigate} onOpenJoinModal={handleOpenJoin} />

            {/* 08 — Trainers (06 / IN YOUR CORNER) */}
            <TrainersSection onNavigate={navigate} />

            {/* 09 — Community (07 / OUR PEOPLE) */}
            <CommunitySection />

            {/* 10 — Gym Gallery (08 / INSIDE THE GYM) */}
            <GymGallerySection />

            {/* 11 — Final CTA */}
            <FinalCTA onOpenJoinModal={handleOpenJoin} onNavigate={navigate} />
          </div>
        </main>

        {/* 12 — Footer */}
        <Footer onOpenJoinModal={handleOpenJoin} onNavigate={navigate} />

        {/* Interactive Registration / Join Modal */}
        <JoinModal isOpen={joinModalOpen} onClose={handleCloseJoin} />
      </div>
    </WebsiteContentProvider>
  );
}
