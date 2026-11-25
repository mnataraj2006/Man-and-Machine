import React, { useState, useEffect } from 'react';

export default function JoinModal({ isOpen, onClose }) {
  const [selectedPlan, setSelectedPlan] = useState('quarterly');
  const [formData, setFormData] = useState({ name: '', phone: '', branch: 'Kovilpatti', goal: 'Strength & Hypertrophy' });
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const plans = [
    {
      id: 'monthly',
      name: '1 MONTH',
      price: '₹1,500',
      period: '/ month',
      features: ['Full gym access', 'General guidance', 'Locker access'],
    },
    {
      id: 'quarterly',
      name: '3 MONTHS',
      popular: true,
      price: '₹3,999',
      period: '/ 3 months',
      features: ['Save 12%', 'Custom workout split', 'Body composition tracking', 'Trainer support'],
    },
    {
      id: 'annual',
      name: '12 MONTHS',
      price: '₹11,999',
      period: '/ year',
      features: ['Best Value (Save 33%)', 'Personal fitness protocol', 'Dietary guidance', 'Priority racks access'],
    },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-xl bg-[#090909] border border-[#303030] rounded-2xl shadow-2xl p-5 sm:p-7 max-h-[92vh] overflow-y-auto my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button (Min 44x44px target) */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-3.5 right-3.5 w-10 h-10 flex items-center justify-center text-[#B8B8B8] hover:text-[#F5F5F5] rounded-lg border border-[#303030] hover:border-[#EB3E2E] transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {isSubmitted ? (
          <div className="text-center py-6 sm:py-8 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#EB3E2E]/20 border border-[#EB3E2E] flex items-center justify-center">
              <span className="material-symbols-outlined text-[36px] text-[#EB3E2E]">check_circle</span>
            </div>
            <h3 
              className="text-lg sm:text-2xl uppercase text-[#F5F5F5] font-bold"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              WELCOME TO MAN &amp; MACHINE
            </h3>
            <p className="text-sm sm:text-base text-[#B8B8B8] max-w-md leading-relaxed">
              Thank you, <span className="text-[#F5F5F5] font-bold">{formData.name}</span>! Our head trainer for the <span className="text-[#EB3E2E] font-bold">{formData.branch}</span> branch will contact you at <span className="text-[#EB3E2E] font-mono">{formData.phone}</span> shortly.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center w-full sm:w-auto">
              <a
                href={`https://wa.me/917598885566?text=Hi%20Man%20%26%20Machine%20Gym,%20I%20am%20${encodeURIComponent(formData.name)}%20and%20interested%20in%20joining.`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#EB3E2E] text-white font-bold text-xs uppercase px-6 py-3.5 rounded-xl text-center min-h-[48px] flex items-center justify-center"
              >
                Chat on WhatsApp Now
              </a>
              <button
                onClick={onClose}
                className="bg-[#202020] text-[#F5F5F5] font-bold text-xs uppercase px-6 py-3.5 rounded-xl border border-[#303030] min-h-[48px]"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2.5 mb-2.5 pr-8">
              <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 border border-[#303030]">
                <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <span 
                className="text-[9.5px] sm:text-[10px] uppercase tracking-widest text-[#EB3E2E] font-bold truncate"
                style={{ fontFamily: "'Oswald', sans-serif" }}
              >
                MEMBERSHIP REGISTRATION • 3 LOCATIONS
              </span>
            </div>
            <h3 
              className="text-lg sm:text-2xl uppercase text-[#F5F5F5] font-bold tracking-tight mb-4"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              CHOOSE YOUR PROTOCOL
            </h3>

            {/* Plan selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-5">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    selectedPlan === plan.id
                      ? 'border-[#EB3E2E] bg-[#202020] shadow-[0_0_15px_rgba(235,62,46,0.20)]'
                      : 'border-[#303030] bg-[#181818] hover:border-[#B8B8B8]/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span 
                        className="text-xs uppercase font-bold text-[#F5F5F5]"
                        style={{ fontFamily: "'Oswald', sans-serif" }}
                      >
                        {plan.name}
                      </span>
                      {plan.popular && (
                        <span className="text-[8.5px] bg-[#EB3E2E] text-white px-1.5 py-0.5 rounded font-bold uppercase">
                          POPULAR
                        </span>
                      )}
                    </div>
                    <div 
                      className="text-lg sm:text-xl text-[#F5F5F5] font-mono font-bold"
                      style={{ fontFamily: "'Oswald', sans-serif" }}
                    >
                      {plan.price}
                      <span className="text-[11px] text-[#B8B8B8] font-normal">{plan.period}</span>
                    </div>
                  </div>
                  <ul className="mt-2 text-[11px] text-[#B8B8B8] space-y-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-1.5 leading-snug">
                        <span className="text-[#EB3E2E] font-bold">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-[#B8B8B8] mb-1">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Arun Kumar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#181818] border border-[#303030] rounded-xl px-3.5 py-3 text-[#F5F5F5] text-base sm:text-sm focus:outline-none focus:border-[#EB3E2E] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase font-bold text-[#B8B8B8] mb-1">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#181818] border border-[#303030] rounded-xl px-3.5 py-3 text-[#F5F5F5] text-base sm:text-sm focus:outline-none focus:border-[#EB3E2E] transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-[#B8B8B8] mb-1">
                    Select Your Branch
                  </label>
                  <select
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="w-full bg-[#181818] border border-[#303030] rounded-xl px-3.5 py-3 text-[#F5F5F5] text-base sm:text-sm focus:outline-none focus:border-[#EB3E2E] transition-colors"
                  >
                    <option value="Kovilpatti">Kovilpatti (Flagship Center)</option>
                    <option value="Karur">Karur Branch</option>
                    <option value="Sivakasi">Sivakasi Branch</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase font-bold text-[#B8B8B8] mb-1">
                    Primary Fitness Objective
                  </label>
                  <select
                    value={formData.goal}
                    onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                    className="w-full bg-[#181818] border border-[#303030] rounded-xl px-3.5 py-3 text-[#F5F5F5] text-base sm:text-sm focus:outline-none focus:border-[#EB3E2E] transition-colors"
                  >
                    <option>Strength &amp; Heavy Iron (Powerlifting)</option>
                    <option>Hypertrophy &amp; Muscle Building</option>
                    <option>Fat Loss &amp; Metabolic Conditioning</option>
                    <option>1-on-1 Personalized Coaching</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <a
                  href="tel:+917598885566"
                  className="inline-flex items-center gap-1.5 text-[#B8B8B8] hover:text-[#F5F5F5] text-xs py-1"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#EB3E2E]">call</span>
                  <span>Direct Hotline: +91 75988 85566</span>
                </a>
                <button
                  type="submit"
                  className="bg-[#EB3E2E] hover:bg-[#FF493B] text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-[0_0_15px_rgba(235,62,46,0.30)] active:scale-95 transition-all cursor-pointer min-h-[48px] text-center"
                >
                  CONFIRM &amp; JOIN
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
