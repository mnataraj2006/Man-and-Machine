const Branch = require('../models/Branch');

const initialBranches = [
  {
    name: 'Man & Machine Fitness Gym (HQ)',
    city: 'Kovilpatti',
    address: 'Balaji Complex, 580E/5, Ettayapuram Road, Thittankulam, Kovilpatti, Tamil Nadu – 628501',
    phone: '+91 75988 85566',
    openingHours: 'Mon-Sat: 5:30 AM - 9:30 PM | Sun: 5:30 AM - 10:00 AM',
    isActive: true,
  },
  {
    name: 'Man & Machine Fitness',
    city: 'Karur',
    address: 'Karur, Tamil Nadu',
    phone: '',
    openingHours: 'Daily: 4:30 AM - 11:00 AM & 4:00 PM - 10:00 PM',
    isActive: true,
  },
  {
    name: 'Man & Machine Fitness',
    city: 'Sivakasi',
    address: 'Sivakasi, Tamil Nadu',
    phone: '+91 70142 33840',
    openingHours: 'Mon-Sat: 5:00 AM - 10:00 PM | Sun: 5:00 AM - 12:00 PM',
    isActive: true,
  },
];

/**
 * Seed initial branches if they do not already exist.
 * Never creates duplicate branches.
 */
const seedBranches = async () => {
  try {
    for (const b of initialBranches) {
      const exists = await Branch.findOne({ city: b.city });
      if (!exists) {
        await Branch.create(b);
        console.log(`Branch seeded successfully: ${b.city}`);
      }
    }
  } catch (err) {
    console.error('Branch seeding notice:', err.message);
  }
};

module.exports = seedBranches;
