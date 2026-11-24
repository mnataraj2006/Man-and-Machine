const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const MembershipPlan = require('../models/MembershipPlan');
const Branch = require('../models/Branch');

async function seedBranchPricing() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ Connected to MongoDB Atlas');

  const branches = await Branch.find();
  const kp = branches.find((b) => b.city === 'Kovilpatti');
  const kr = branches.find((b) => b.city === 'Karur');
  const sk = branches.find((b) => b.city === 'Sivakasi');

  if (!kp || !kr || !sk) {
    throw new Error('Required branches (Kovilpatti, Karur, Sivakasi) not found');
  }

  const configs = {
    '1 Month Kickstart': {
      durationDays: 30,
      durationMonths: 1,
      benefits: [
        'Full gym floor & station access',
        'Air-conditioned facility',
        'Steam bath access',
        'Locker privileges',
        'Free Wi-Fi access',
      ],
      pricing: [
        { branchId: kp._id, isAvailable: true, basePrice: 1500, joiningFee: 200, discountType: 'FIXED', discountValue: 100, finalPrice: 1600 },
        { branchId: kr._id, isAvailable: true, basePrice: 1400, joiningFee: 200, discountType: 'FIXED', discountValue: 100, finalPrice: 1500 },
        { branchId: sk._id, isAvailable: true, basePrice: 1300, joiningFee: 200, discountType: 'FIXED', discountValue: 100, finalPrice: 1400 },
      ],
    },
    '3 Months Quarter Pro': {
      durationDays: 90,
      durationMonths: 3,
      benefits: [
        'Full gym access across all stations',
        'Air-conditioned facility',
        'Steam bath privileges',
        'Free locker & key card',
        'Bi-weekly fitness calibration',
      ],
      pricing: [
        { branchId: kp._id, isAvailable: true, basePrice: 4200, joiningFee: 200, discountType: 'FIXED', discountValue: 200, finalPrice: 4200 },
        { branchId: kr._id, isAvailable: true, basePrice: 3900, joiningFee: 200, discountType: 'FIXED', discountValue: 200, finalPrice: 3900 },
        { branchId: sk._id, isAvailable: true, basePrice: 3600, joiningFee: 200, discountType: 'FIXED', discountValue: 200, finalPrice: 3600 },
      ],
    },
    '6 Months Half-Year Elite': {
      durationDays: 180,
      durationMonths: 6,
      benefits: [
        'Full unrestricted gym access',
        'Zero joining fee (waived)',
        'Unlimited steam bath sessions',
        'Permanent dedicated locker',
        'Monthly body composition review',
      ],
      pricing: [
        { branchId: kp._id, isAvailable: true, basePrice: 7500, joiningFee: 0, discountType: 'FIXED', discountValue: 500, finalPrice: 7000 },
        { branchId: kr._id, isAvailable: true, basePrice: 7000, joiningFee: 0, discountType: 'FIXED', discountValue: 500, finalPrice: 6500 },
        { branchId: sk._id, isAvailable: true, basePrice: 6500, joiningFee: 0, discountType: 'FIXED', discountValue: 500, finalPrice: 6000 },
      ],
    },
    '12 Months Annual Champion': {
      durationDays: 365,
      durationMonths: 12,
      benefits: [
        '365 Days all-access floor pass',
        'VIP locker & bath amenities',
        'Zero joining fee (waived)',
        'Priority access during peak hours',
        'Complimentary guest passes (4/year)',
      ],
      pricing: [
        { branchId: kp._id, isAvailable: true, basePrice: 13000, joiningFee: 0, discountType: 'FIXED', discountValue: 1000, finalPrice: 12000 },
        { branchId: kr._id, isAvailable: true, basePrice: 12000, joiningFee: 0, discountType: 'FIXED', discountValue: 1000, finalPrice: 11000 },
        { branchId: sk._id, isAvailable: true, basePrice: 11000, joiningFee: 0, discountType: 'FIXED', discountValue: 1000, finalPrice: 10000 },
      ],
    },
  };

  for (const [name, data] of Object.entries(configs)) {
    await MembershipPlan.updateOne(
      { name },
      {
        $set: {
          durationDays: data.durationDays,
          durationMonths: data.durationMonths,
          benefits: data.benefits,
          features: data.benefits,
          branchPricing: data.pricing,
          isActive: true,
        },
      }
    );
    console.log(`✓ Updated branch pricing for: ${name}`);
  }

  console.log('🎉 Branch pricing configured successfully for all plans in Atlas.');
  await mongoose.disconnect();
}

seedBranchPricing().catch((err) => {
  console.error(err);
  process.exit(1);
});
