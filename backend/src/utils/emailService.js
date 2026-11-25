const nodemailer = require('nodemailer');

/**
 * Check whether SMTP environment configuration is complete.
 */
const isEmailConfigured = () => {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
};

/**
 * Create Nodemailer transporter only when SMTP settings exist.
 */
const createTransporter = () => {
  if (!isEmailConfigured()) return null;

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const getFromAddress = () => {
  return process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@manandmachine.com';
};

/**
 * Send Trainer Account Activation Invitation Email.
 * Never claims an email was delivered if SMTP is unconfigured or fails.
 */
const sendTrainerInvitation = async ({ to, trainerName, branchName, activationUrl, expiresInHours = 24 }) => {
  if (!isEmailConfigured()) {
    return {
      configured: false,
      delivered: false,
      reason: 'SMTP email delivery is not configured in environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS).',
    };
  }

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Man & Machine Fitness" <${getFromAddress()}>`,
      to,
      subject: 'Activate Your Man & Machine Coach Account',
      html: `
        <div style="background:#090909;color:#F5F5F5;padding:32px;font-family:Arial,sans-serif;border:1px solid #303030;">
          <p style="color:#EB3E2E;font-size:11px;letter-spacing:2px;font-weight:bold;text-transform:uppercase;margin:0 0 12px;">
            MAN &amp; MACHINE FITNESS CENTRE
          </p>
          <h1 style="font-size:26px;text-transform:uppercase;margin:0 0 16px;color:#F5F5F5;">
            Welcome to the Coaching Team, ${trainerName}
          </h1>
          <p style="color:#B8B8B8;font-size:14px;line-height:1.6;margin:0 0 20px;">
            An administrator has created your Trainer Portal account for <strong style="color:#F5F5F5;">${branchName || 'Man & Machine'}</strong>.
            Click the button below to verify your account and set your private password.
          </p>
          <a href="${activationUrl}" style="display:inline-block;background:#EB3E2E;color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;padding:14px 24px;">
            Activate Account &amp; Set Password
          </a>
          <p style="color:#858585;font-size:12px;line-height:1.6;margin:24px 0 0;">
            This single-use invitation link expires in ${expiresInHours} hours. If you were not expecting this invitation, ignore this email.
          </p>
        </div>
      `,
    });

    return { configured: true, delivered: true };
  } catch (error) {
    return {
      configured: true,
      delivered: false,
      reason: error.message || 'SMTP delivery failed',
    };
  }
};

/**
 * Send Password Reset Email.
 */
const sendPasswordResetEmail = async ({ to, userName, resetUrl, expiresInMinutes = 30 }) => {
  if (!isEmailConfigured()) {
    return {
      configured: false,
      delivered: false,
      reason: 'SMTP email delivery is not configured in environment variables.',
    };
  }

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Man & Machine Fitness" <${getFromAddress()}>`,
      to,
      subject: 'Password Reset Request — Man & Machine',
      html: `
        <div style="background:#090909;color:#F5F5F5;padding:32px;font-family:Arial,sans-serif;border:1px solid #303030;">
          <p style="color:#EB3E2E;font-size:11px;letter-spacing:2px;font-weight:bold;text-transform:uppercase;margin:0 0 12px;">
            MAN &amp; MACHINE FITNESS CENTRE
          </p>
          <h1 style="font-size:24px;text-transform:uppercase;margin:0 0 16px;color:#F5F5F5;">
            Reset Your Password
          </h1>
          <p style="color:#B8B8B8;font-size:14px;line-height:1.6;margin:0 0 20px;">
            Hi ${userName || 'Member'}, a password reset was requested for your Man &amp; Machine account.
            Use the single-use link below to choose a new password.
          </p>
          <a href="${resetUrl}" style="display:inline-block;background:#EB3E2E;color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;padding:14px 24px;">
            Reset Password
          </a>
          <p style="color:#858585;font-size:12px;line-height:1.6;margin:24px 0 0;">
            This link expires in ${expiresInMinutes} minutes and can only be used once. If you did not request a password reset, you can safely ignore this message.
          </p>
        </div>
      `,
    });

    return { configured: true, delivered: true };
  } catch (error) {
    return {
      configured: true,
      delivered: false,
      reason: error.message || 'SMTP delivery failed',
    };
  }
};

module.exports = {
  isEmailConfigured,
  sendTrainerInvitation,
  sendPasswordResetEmail,
};
