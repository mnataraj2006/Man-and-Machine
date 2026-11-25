import React, { useState, useEffect } from 'react';
import Header from './components/Navbar/Header.jsx';
import Hero from './components/Hero/Hero.jsx';
import BrandStatement from './components/Editorial/BrandStatement.jsx';
import WhyManAndMachine from './components/Editorial/WhyManAndMachine.jsx';
import ExperienceSection from './components/Editorial/ExperienceSection.jsx';
import Facilities from './components/Facilities/Facilities.jsx';
import MembershipPlansPreview from './components/Membership/MembershipPlansPreview.jsx';
import TrainersSection from './components/Trainer/TrainersSection.jsx';
import CommunitySection from './components/Stats/CommunitySection.jsx';
import TransformationSection from './components/Editorial/TransformationSection.jsx';
import FinalCTA from './components/CTA/FinalCTA.jsx';
import Footer from './components/Footer/Footer.jsx';
import JoinModal from './components/Navbar/JoinModal.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ActivateAccount from './pages/ActivateAccount.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import TrainerDashboard from './pages/TrainerDashboard.jsx';
import ClientLayout from './components/Client/ClientLayout.jsx';
import DashboardHome from './pages/Client/DashboardHome.jsx';
import Workouts from './pages/Client/Workouts.jsx';
import WorkoutDetail from './pages/Client/WorkoutDetail.jsx';
import Attendance from './pages/Client/Attendance.jsx';
import Progress from './pages/Client/Progress.jsx';
import Membership from './pages/Client/Membership.jsx';
import Payments from './pages/Client/Payments.jsx';
import Trainer from './pages/Client/Trainer.jsx';
import Notifications from './pages/Client/Notifications.jsx';
import Profile from './pages/Client/Profile.jsx';
import Settings from './pages/Client/Settings.jsx';

// Admin Application Suite
import AdminLayout from './components/Admin/AdminLayout.jsx';
import AdminDashboardHome from './pages/Admin/DashboardHome.jsx';
import AdminBranches from './pages/Admin/Branches.jsx';
import AdminClients from './pages/Admin/Clients.jsx';
import AdminTrainers from './pages/Admin/Trainers.jsx';
import AdminMembershipPlans from './pages/Admin/MembershipPlans.jsx';
import AdminMemberships from './pages/Admin/Memberships.jsx';
import AdminAttendance from './pages/Admin/Attendance.jsx';
import AdminPayments from './pages/Admin/Payments.jsx';
import AdminNotifications from './pages/Admin/Notifications.jsx';
import AdminSettings from './pages/Admin/Settings.jsx';

// Trainer Application Suite
import TrainerLayout from './components/Trainer/TrainerLayout.jsx';
import TrainerDashboardHome from './pages/Trainer/DashboardHome.jsx';
import TrainerClients from './pages/Trainer/Clients.jsx';
import TrainerClientDetail from './pages/Trainer/ClientDetail.jsx';
import TrainerWorkouts from './pages/Trainer/Workouts.jsx';
import TrainerWorkoutCreate from './pages/Trainer/WorkoutCreate.jsx';
import TrainerSchedule from './pages/Trainer/Schedule.jsx';
import TrainerSessions from './pages/Trainer/Sessions.jsx';
import TrainerProgress from './pages/Trainer/Progress.jsx';
import TrainerAttendance from './pages/Trainer/Attendance.jsx';
import TrainerNotifications from './pages/Trainer/Notifications.jsx';
import TrainerProfile from './pages/Trainer/Profile.jsx';
import TrainerSettings from './pages/Trainer/Settings.jsx';
import authService from './services/auth.js';

export default function App() {
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

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
    } else if (currentPath === '/admin/membership-plans' || currentPath.startsWith('/admin/membership-plans/')) {
      adminContent = <AdminMembershipPlans onNavigate={navigate} />;
    } else if (currentPath === '/admin/memberships') {
      adminContent = <AdminMemberships onNavigate={navigate} />;
    } else if (currentPath === '/admin/attendance') {
      adminContent = <AdminAttendance onNavigate={navigate} />;
    } else if (currentPath === '/admin/payments') {
      adminContent = <AdminPayments onNavigate={navigate} />;
    } else if (currentPath === '/admin/notifications') {
      adminContent = <AdminNotifications onNavigate={navigate} />;
    } else if (currentPath === '/admin/settings') {
      adminContent = <AdminSettings onNavigate={navigate} onLogout={() => navigate('/login')} />;
    } else {
      adminContent = <AdminDashboardHome onNavigate={navigate} />;
    }

    return (
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
    );
  }

  // Dedicated Signup & Register routes
  if (currentPath === '/signup' || currentPath === '/register') {
    return (
      <Signup 
        onNavigate={navigate} 
      />
    );
  }

  // Dedicated Account Activation route (/activate-account/:token)
  if (currentPath.startsWith('/activate-account/')) {
    const token = currentPath.replace('/activate-account/', '').split('?')[0];
    return <ActivateAccount token={token} onNavigate={navigate} />;
  }

  // Forgot & Reset Password routes
  if (currentPath === '/forgot-password') {
    return <ForgotPassword onNavigate={navigate} />;
  }

  if (currentPath.startsWith('/reset-password/')) {
    const token = currentPath.replace('/reset-password/', '').split('?')[0];
    return <ResetPassword token={token} onNavigate={navigate} />;
  }

  // Dedicated Login page
  if (currentPath === '/login') {
    return (
      <Login 
        onNavigate={navigate} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#090909] text-[#F5F5F5] antialiased selection:bg-[#EB3E2E] selection:text-[#F5F5F5] w-full">
      {/* 01 — Navigation */}
      <Header 
        onOpenJoinModal={handleOpenJoin} 
        onNavigate={navigate}
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

          {/* 10 — Transformation (08 / ONE REP AT A TIME) */}
          <TransformationSection />

          {/* 11 — Final CTA */}
          <FinalCTA onOpenJoinModal={handleOpenJoin} onNavigate={navigate} />
        </div>
      </main>

      {/* 12 — Footer */}
      <Footer onOpenJoinModal={handleOpenJoin} onNavigate={navigate} />

      {/* Interactive Registration / Join Modal */}
      <JoinModal isOpen={joinModalOpen} onClose={handleCloseJoin} />
    </div>
  );
}
