import React, { useState } from 'react';
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

export default function App() {
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  const handleOpenJoin = () => setJoinModalOpen(true);
  const handleCloseJoin = () => setJoinModalOpen(false);

  return (
    <div className="min-h-screen bg-[#09090B] text-[#F5F5F5] font-body-md text-body-md antialiased selection:bg-primary-container selection:text-white w-full">
      {/* Fixed Header */}
      <Header onOpenJoinModal={handleOpenJoin} />

      {/* Main Content Sections */}
      <main className="w-full pt-16 sm:pt-20 bg-[#09090B] min-h-screen">
        <div className="flex flex-col w-full text-[#F5F5F5]">
          {/* 1. Hero Section */}
          <Hero onOpenJoinModal={handleOpenJoin} />

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
          <MembershipCTA onOpenJoinModal={handleOpenJoin} />

          {/* 8. Location & Hours Interactive Section */}
          <LocationAndHours />

          {/* 9. Final CTA */}
          <FinalCTA onOpenJoinModal={handleOpenJoin} />
        </div>
      </main>

      {/* Footer */}
      <Footer onOpenJoinModal={handleOpenJoin} />

      {/* Interactive Registration / Join Modal */}
      <JoinModal isOpen={joinModalOpen} onClose={handleCloseJoin} />
    </div>
  );
}
