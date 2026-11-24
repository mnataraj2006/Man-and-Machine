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
import Register from './pages/Register.jsx';
import Account from './pages/Account.jsx';
import authService from './services/auth.js';

export default function App() {
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      if (path === '/account' && !authService.isAuthenticated()) {
        window.history.replaceState({}, '', '/login');
        setCurrentPath('/login');
      } else {
        setCurrentPath(path);
      }
    };

    // Check initial path on load
    if (window.location.pathname === '/account' && !authService.isAuthenticated()) {
      window.history.replaceState({}, '', '/login');
      setCurrentPath('/login');
    }

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigate = (path) => {
    if (path === '/account' && !authService.isAuthenticated()) {
      path = '/login';
    }
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenJoin = () => navigate('/login');
  const handleCloseJoin = () => setJoinModalOpen(false);

  // If path is /account, render protected Account page
  if (currentPath === '/account') {
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return null;
    }
    return (
      <Account 
        onNavigate={navigate} 
        onLogout={() => navigate('/login')} 
      />
    );
  }

  // If path is /register, render the dedicated Register page
  if (currentPath === '/register') {
    return (
      <Register 
        onNavigate={navigate} 
      />
    );
  }

  // If path is /login, render the dedicated Login page
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
