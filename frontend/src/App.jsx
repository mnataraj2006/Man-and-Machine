import React, { useState, useEffect } from 'react';
import Header from './components/Navbar/Header.jsx';
import Hero from './components/Hero/Hero.jsx';
import SocialProof from './components/Stats/SocialProof.jsx';
import Facilities from './components/Facilities/Facilities.jsx';
import Manifesto from './components/CTA/Manifesto.jsx';
import Testimonials from './components/Reviews/Testimonials.jsx';
import Branches from './components/Branches/Branches.jsx';
import MembershipCTA from './components/CTA/MembershipCTA.jsx';
import LocationAndHours from './components/Location/LocationAndHours.jsx';
import FinalCTA from './components/CTA/FinalCTA.jsx';
import Footer from './components/Footer/Footer.jsx';
import JoinModal from './components/Navbar/JoinModal.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
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
import AdminMemberships from './pages/Admin/Memberships.jsx';
import AdminAttendance from './pages/Admin/Attendance.jsx';
import AdminWorkouts from './pages/Admin/Workouts.jsx';
import AdminPayments from './pages/Admin/Payments.jsx';
import AdminReports from './pages/Admin/Reports.jsx';
import AdminNotifications from './pages/Admin/Notifications.jsx';
import AdminEnquiries from './pages/Admin/Enquiries.jsx';
import AdminSettings from './pages/Admin/Settings.jsx';
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
    } else if (currentPath === '/client/membership') {
      clientContent = <Membership onNavigate={navigate} />;
    } else if (currentPath === '/client/payments') {
      clientContent = <Payments onNavigate={navigate} />;
    } else if (currentPath === '/client/trainer') {
      clientContent = <Trainer onNavigate={navigate} />;
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
    } else if (currentPath === '/admin/memberships') {
      adminContent = <AdminMemberships onNavigate={navigate} />;
    } else if (currentPath === '/admin/attendance') {
      adminContent = <AdminAttendance onNavigate={navigate} />;
    } else if (currentPath === '/admin/workouts') {
      adminContent = <AdminWorkouts onNavigate={navigate} />;
    } else if (currentPath === '/admin/payments') {
      adminContent = <AdminPayments onNavigate={navigate} />;
    } else if (currentPath === '/admin/reports') {
      adminContent = <AdminReports onNavigate={navigate} />;
    } else if (currentPath === '/admin/notifications') {
      adminContent = <AdminNotifications onNavigate={navigate} />;
    } else if (currentPath === '/admin/enquiries') {
      adminContent = <AdminEnquiries onNavigate={navigate} />;
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

  // Trainer Dashboard
  if (currentPath === '/trainer/dashboard') {
    return (
      <TrainerDashboard 
        onNavigate={navigate} 
        onLogout={() => navigate('/login')} 
      />
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

  // Dedicated Login page
  if (currentPath === '/login') {
    return (
      <Login 
        onNavigate={navigate} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-[#F5F5F5] font-body-md text-body-md antialiased selection:bg-primary-container selection:text-white w-full">
      {/* Fixed Header */}
      <Header 
        onOpenJoinModal={handleOpenJoin} 
        onNavigate={navigate}
      />

      {/* Main Content Sections */}
      <main className="w-full pt-16 sm:pt-20 bg-[#09090B] min-h-screen">
        <div className="flex flex-col w-full text-[#F5F5F5]">
          {/* 1. Hero Section */}
          <Hero 
            onOpenJoinModal={handleOpenJoin} 
            onNavigate={navigate}
          />

          {/* 2. Social Proof / Credibility Strip */}
          <SocialProof />

          {/* 3. Facilities Bento Grid & Mobile Gallery Section */}
          <Facilities />

          {/* 4. Cinematic Statement / Manifesto Break */}
          <Manifesto />

          {/* 5. Verified Reviews Section */}
          <Testimonials />

          {/* 6. Our Branches Section (One Brand. Three Locations.) */}
          <Branches />

          {/* 7. Membership High-Conversion CTA Section */}
          <MembershipCTA onOpenJoinModal={handleOpenJoin} onNavigate={navigate} />

          {/* 8. Location & Hours Interactive Section */}
          <LocationAndHours />

          {/* 9. Final CTA */}
          <FinalCTA onOpenJoinModal={handleOpenJoin} onNavigate={navigate} />
        </div>
      </main>

      {/* Footer */}
      <Footer onOpenJoinModal={handleOpenJoin} onNavigate={navigate} />

      {/* Interactive Registration / Join Modal */}
      <JoinModal isOpen={joinModalOpen} onClose={handleCloseJoin} />
    </div>
  );
}
