/**
 * Short-lived in-memory dashboard summary cache with strict role/branch/user isolation
 * and explicit mutation-based invalidation.
 */

const store = new Map();

function getCached(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function setCached(key, value, ttlMs = 30000) {
  // Bound cache size to prevent unbounded memory growth
  if (store.size > 1000) {
    const firstKey = store.keys().next().value;
    if (firstKey) store.delete(firstKey);
  }
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

function invalidatePrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

function invalidateAdminDashboards() {
  invalidatePrefix('admin:dashboard:');
}

function invalidateTrainerDashboard(trainerId) {
  if (trainerId) {
    store.delete(`trainer:dashboard:${trainerId}`);
  } else {
    invalidatePrefix('trainer:dashboard:');
  }
}

function invalidateClientDashboard(userId) {
  if (userId) {
    store.delete(`client:dashboard:${userId}`);
  } else {
    invalidatePrefix('client:dashboard:');
  }
}

function invalidateOnAttendance(userId) {
  invalidateAdminDashboards();
  invalidatePrefix('trainer:dashboard:');
  if (userId) invalidateClientDashboard(userId);
}

function invalidateOnFinanceOrMembership(userId) {
  invalidateAdminDashboards();
  if (userId) invalidateClientDashboard(userId);
}

function clearAllDashboardCache() {
  store.clear();
}

function getCacheStats() {
  return { size: store.size };
}

module.exports = {
  getCached,
  setCached,
  invalidatePrefix,
  invalidateAdminDashboards,
  invalidateTrainerDashboard,
  invalidateClientDashboard,
  invalidateOnAttendance,
  invalidateOnFinanceOrMembership,
  clearAllDashboardCache,
  getCacheStats,
};
