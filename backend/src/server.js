const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectDB = require('./config/db');
const seedBranches = require('./config/seedBranches');
const seedAdmin = require('./scripts/seedAdmin');
const authRoutes = require('./routes/authRoutes');
const branchRoutes = require('./routes/branchRoutes');
const clientRoutes = require('./routes/clientRoutes');
const adminRoutes = require('./routes/adminRoutes');
const trainerRoutes = require('./routes/trainerRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const reportRoutes = require('./routes/reportRoutes');
const biometricRoutes = require('./routes/biometricRoutes');
const admsRoutes = require('./routes/admsRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed Origins for CORS
const clientUrls = (process.env.CLIENT_URL || '')
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const allowedOrigins = [
  ...clientUrls,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests or matching origins
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/+$/, '');

    let isVercel = false;
    try {
      isVercel = /\.vercel\.app$/.test(new URL(origin).hostname);
    } catch (e) {
      // ignore invalid URL format
    }

    if (
      allowedOrigins.includes(normalizedOrigin) ||
      process.env.NODE_ENV !== 'production' ||
      isVercel
    ) {
      return callback(null, true);
    }
    return callback(new Error(`Blocked by CORS policy: origin ${origin} is not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middlewares
app.use(cors(corsOptions));
// Preserve the exact bytes used to validate signed WhatsApp webhook callbacks.
app.use(express.json({ verify: (req, res, buffer) => { if (req.originalUrl === '/api/whatsapp/webhook') req.rawBody = Buffer.from(buffer); } }));
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Man & Machine API is running',
  });
});

// Available Membership Plans public / branch endpoint
app.get('/api/membership-plans/available', async (req, res, next) => {
  try {
    const { branchId } = req.query;
    const MembershipPlan = require('./models/MembershipPlan');
    const Branch = require('./models/Branch');

    let targetBranchId = branchId;
    if (!targetBranchId) {
      const defaultBranch = (await Branch.findOne({ city: 'Kovilpatti' })) || (await Branch.findOne());
      targetBranchId = defaultBranch ? defaultBranch._id : null;
    }

    const plans = await MembershipPlan.find({ isActive: true })
      .sort({ displayOrder: 1, durationDays: 1, createdAt: 1 })
      .populate('branchPricing.branchId', 'name city code');

    const availablePlans = [];
    for (const plan of plans) {
      const branchConfig = (plan.branchPricing || []).find(
        (bp) =>
          bp.branchId &&
          (bp.branchId._id?.toString() === targetBranchId?.toString() ||
            bp.branchId.toString() === targetBranchId?.toString())
      );

      if (branchConfig && branchConfig.isAvailable) {
        availablePlans.push({
          _id: plan._id,
          name: plan.name,
          code: plan.code,
          description: plan.description,
          planType: plan.planType,
          durationDays: plan.durationDays || 30,
          durationMonths: plan.durationMonths || 1,
          isFeatured: Boolean(plan.isFeatured || plan.isPopular),
          benefits: plan.benefits && plan.benefits.length > 0 ? plan.benefits : plan.features || [],
          basePrice: branchConfig.basePrice,
          joiningFee: branchConfig.joiningFee || 0,
          discountType: branchConfig.discountType || 'NONE',
          discountValue: branchConfig.discountValue || 0,
          finalPrice: branchConfig.finalPrice,
          branch: branchConfig.branchId,
        });
      }
    }

    const branch = targetBranchId ? await Branch.findById(targetBranchId).select('name city code') : null;

    res.status(200).json({
      success: true,
      count: availablePlans.length,
      branch,
      plans: availablePlans,
    });
  } catch (err) {
    next(err);
  }
});

// Public Trainers endpoint for homepage showcase
app.get('/api/public/trainers', async (req, res, next) => {
  try {
    const User = require('./models/User');
    const TrainerProfile = require('./models/TrainerProfile');

    const trainerUsers = await User.find({ role: 'TRAINER', status: 'ACTIVE' })
      .select('name branchId')
      .populate('branchId', 'name city')
      .sort({ createdAt: 1 });

    const trainerIds = trainerUsers.map((u) => u._id);
    const profiles = await TrainerProfile.find({ userId: { $in: trainerIds } });
    const profileMap = new Map();
    profiles.forEach((p) => profileMap.set(p.userId.toString(), p));

    const trainers = trainerUsers.map((u) => {
      const prof = profileMap.get(u._id.toString());
      return {
        _id: u._id,
        name: u.name,
        branch: u.branchId,
        specialization: prof?.specialization || 'STRENGTH & CONDITIONING',
        experienceYears: prof?.experienceYears || 5,
        bio:
          prof?.bio ||
          'Purposeful coaching built around your movement, consistency and long-term progress.',
        rating: prof?.rating || 4.9,
        acceptingClients: prof?.acceptingClients !== false,
      };
    });

    res.status(200).json({
      success: true,
      count: trainers.length,
      trainers,
    });
  } catch (err) {
    next(err);
  }
});

// Public Community Statistics endpoint
app.get('/api/public/stats', async (req, res, next) => {
  try {
    const User = require('./models/User');
    const Membership = require('./models/Membership');
    const WorkoutSession = require('./models/WorkoutSession');
    const Branch = require('./models/Branch');

    const [clientCount, activeMembershipsCount, workoutSessionsCount, branchesCount] =
      await Promise.all([
        User.countDocuments({ role: 'CLIENT', status: 'ACTIVE' }),
        Membership.countDocuments({ status: 'ACTIVE' }),
        WorkoutSession.countDocuments(),
        Branch.countDocuments({ isActive: true }),
      ]);

    const verifiedProductionScale = clientCount >= 50 || activeMembershipsCount >= 50;

    res.status(200).json({
      success: true,
      stats: {
        activeMembersCount: Math.max(clientCount, activeMembershipsCount),
        workoutSessionsCount,
        branchesCount,
        daysPerWeek: 7,
        verifiedProductionScale,
      },
    });
  } catch (err) {
    next(err);
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/trainer', trainerRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/biometric', biometricRoutes);
// eSSL / ZKTeco ADMS push protocol endpoints
app.use('/iclock', admsRoutes);
// Public only for Meta's signed webhook verification/callback; all management routes are ADMIN-only.
app.use('/api/whatsapp', whatsappRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Man & Machine Fitness API',
    status: 'online',
    version: '1.1.0',
    endpoints: {
      health: 'GET /api/health',
      branches: 'GET /api/branches',
      auth: {
        register: 'POST /api/auth/register',
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me (Protected)',
      },
    },
  });
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.originalUrl} not found`,
  });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
});

// Start server only after connecting to MongoDB and seeding branches
const startServer = async () => {
  try {
    await connectDB();
    await seedBranches();
    await seedAdmin();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    const admsPort = Number(process.env.ADMS_PORT);
    if (admsPort && admsPort !== Number(PORT)) {
      const admsApp = express();
      admsApp.use('/iclock', admsRoutes);
      admsApp.listen(admsPort, () => {
        console.log(`ADMS Biometric Listener running on port ${admsPort}`);
      });
    }
  } catch (error) {
    console.error('Failed to start server due to database connection error');
    process.exit(1);
  }
};

// Only run listener if this file is executed directly
if (require.main === module) {
  startServer();
}

module.exports = app;
