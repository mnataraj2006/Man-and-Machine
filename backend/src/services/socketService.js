const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io = null;

const initSocketServer = (httpServer, corsOptions = {}) => {
  if (io) return io;

  io = new Server(httpServer, {
    cors: corsOptions,
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  // Authenticate every socket connection; only active ADMIN users are permitted
  io.use(async (socket, next) => {
    try {
      const rawToken =
        socket.handshake?.auth?.token ||
        socket.handshake?.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
        '';

      if (!rawToken) {
        return next(new Error('Unauthorized: Authentication token required'));
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return next(new Error('Server authentication configuration missing'));
      }

      const decoded = jwt.verify(rawToken, secret);
      const user = await User.findById(decoded.id).select('-password').lean();
      if (!user) {
        return next(new Error('Unauthorized: User not found'));
      }

      const decodedVer = typeof decoded.tokenVersion === 'number' ? decoded.tokenVersion : 0;
      const userVer = typeof user.tokenVersion === 'number' ? user.tokenVersion : 0;
      if (decodedVer !== userVer) {
        return next(new Error('Unauthorized: Session expired'));
      }

      if (user.status !== 'ACTIVE') {
        return next(new Error('Unauthorized: Account is not active'));
      }

      if (user.role !== 'ADMIN') {
        return next(new Error('Forbidden: Admin access required'));
      }

      socket.user = {
        id: String(user._id),
        role: user.role,
        branchId: user.branchId ? String(user.branchId) : null,
        name: user.name,
      };
      next();
    } catch (err) {
      next(new Error('Unauthorized: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { branchId } = socket.user;
    if (branchId) {
      socket.join(`admin:branch:${branchId}`);
    } else {
      socket.join('admin:all');
    }

    socket.emit('socket:ready', {
      connected: true,
      scope: branchId ? `branch:${branchId}` : 'all',
    });
  });

  return io;
};

const getIO = () => io;

const closeSocketServer = async () => {
  if (io) {
    await io.close();
    io = null;
  }
};

/**
 * Broadcast an employee attendance notification only to authorized global admins
 * and admins assigned to that employee's branch.
 */
const emitEmployeeAttendanceNotification = (payload) => {
  if (!io || !payload) return false;
  const rooms = ['admin:all'];
  if (payload.branchId) {
    rooms.push(`admin:branch:${String(payload.branchId)}`);
  }
  io.to(rooms).emit('attendance:employee', payload);
  return true;
};

module.exports = {
  initSocketServer,
  getIO,
  closeSocketServer,
  emitEmployeeAttendanceNotification,
};
