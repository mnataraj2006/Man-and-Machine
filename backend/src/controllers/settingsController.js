const User = require('../models/User');

const ALLOWED_THEMES = ['dark', 'light', 'system'];

/**
 * GET /api/settings
 * Returns the authenticated user's persisted UI preferences.
 */
const getUserSettings = async (req, res, next) => {
  try {
    const theme = ALLOWED_THEMES.includes(req.user?.preferences?.theme)
      ? req.user.preferences.theme
      : 'dark';

    res.status(200).json({
      success: true,
      preferences: {
        theme,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/settings
 * Updates only whitelisted user UI preferences (preferences.theme).
 */
const updateUserSettings = async (req, res, next) => {
  try {
    const rawTheme =
      req.body?.preferences?.theme !== undefined
        ? req.body.preferences.theme
        : req.body?.theme;

    const theme = typeof rawTheme === 'string' ? rawTheme.trim().toLowerCase() : '';

    if (!ALLOWED_THEMES.includes(theme)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid theme preference. Allowed values: dark, light, system.',
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { 'preferences.theme': theme } },
      { new: true, runValidators: true }
    ).select('preferences');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Appearance settings saved.',
      preferences: {
        theme: updatedUser.preferences?.theme || theme,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUserSettings,
  updateUserSettings,
};
