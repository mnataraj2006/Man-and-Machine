/**
 * branchService.js
 * ----------------
 * Client service layer for gym branch location data.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Fallback initial branches if backend is momentarily unreachable
const FALLBACK_BRANCHES = [
  {
    id: 'kovilpatti',
    name: 'Man & Machine Fitness Gym (HQ)',
    city: 'Kovilpatti',
    address: 'Balaji Complex, 580E/5, Ettayapuram Road, Thittankulam, Kovilpatti, Tamil Nadu – 628501',
    phone: '+91 75988 85566',
    openingHours: 'Mon-Sat: 5:30 AM - 9:30 PM | Sun: 5:30 AM - 10:00 AM',
  },
  {
    id: 'karur',
    name: 'Man & Machine Fitness',
    city: 'Karur',
    address: 'Karur, Tamil Nadu',
    phone: '',
    openingHours: 'Daily: 4:30 AM - 11:00 AM & 4:00 PM - 10:00 PM',
  },
  {
    id: 'sivakasi',
    name: 'Man & Machine Fitness',
    city: 'Sivakasi',
    address: 'Sivakasi, Tamil Nadu',
    phone: '+91 70142 33840',
    openingHours: 'Mon-Sat: 5:00 AM - 10:00 PM | Sun: 5:00 AM - 12:00 PM',
  },
];

export const branchService = {
  /**
   * Fetch all active branches from backend API.
   * Falls back gracefully to verified local data if needed.
   */
  getBranches: async () => {
    try {
      const response = await fetch(`${BASE_URL}/branches`);
      if (!response.ok) {
        throw new Error('Failed to load branches from API');
      }
      const data = await response.json();
      if (data.branches && data.branches.length > 0) {
        return data.branches;
      }
      return FALLBACK_BRANCHES;
    } catch (err) {
      console.warn('Using fallback branch registry:', err.message);
      return FALLBACK_BRANCHES;
    }
  },
};

export default branchService;
