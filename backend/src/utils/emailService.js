const nodemailer = require('nodemailer');

const getFromAddress = () => {
  return process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@manandmachine.com';
};

const isSmtpConfigured = () => {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
};

/**
 * Check whether any email delivery provider (HTTPS API or SMTP) is configured.
 */
const isEmailConfigured = () => {
  return Boolean(
    process.env.BREVO_API_KEY ||
      process.env.RESEND_API_KEY ||
      isSmtpConfigured()
  );
};

/**
 * Create Nodemailer transporter only when SMTP settings exist.
 * Forces IPv4 and strict timeouts so cloud hosts never hang for minutes.
 */
const createTransporter = (overridePort = null, overrideSecure = null) => {
  if (!isSmtpConfigured()) return null;

  const port = Number(overridePort || process.env.SMTP_PORT || 587);
  const secure =
    overrideSecure !== null
      ? overrideSecure
      : process.env.SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    family: 4,
    connectionTimeout: 4500,
    greetingTimeout: 4500,
    socketTimeout: 6000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Deliver email via HTTPS API (Brevo/Resend — works on Render Free Tier) when configured.
 */
const sendViaHttpsApi = async ({ to, recipientName, subject, html }) => {
  const fromEmail = getFromAddress();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    if (process.env.BREVO_API_KEY) {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'api-key': process.env.BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { name: 'Man & Machine Fitness', email: fromEmail },
          to: [{ email: to, name: recipientName || to }],
          subject,
          htmlContent: html,
        }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || `Brevo API error (${response.status})`);
      }
      return true;
    }

    if (process.env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `"Man & Machine Fitness" <${fromEmail}>`,
          to: [to],
          subject,
          html,
        }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || `Resend API error (${response.status})`);
      }
      return true;
    }

    return false;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Send SMTP mail with strict upper timeout and port 465 fallback.
 */
const sendMailViaSmtp = async (mailOptions) => {
  const sendWithTimeout = (transporter, ms = 7000) => {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        try {
          transporter.close();
        } catch {}
        reject(new Error('SMTP connection timed out (cloud hosts such as Render Free Tier often block outbound SMTP ports 465/587 — configure BREVO_API_KEY for HTTPS delivery or use the manual link).'));
      }, ms);
    });

    return Promise.race([transporter.sendMail(mailOptions), timeoutPromise]).finally(() => {
      clearTimeout(timer);
    });
  };

  const primaryTransporter = createTransporter();
  try {
    await sendWithTimeout(primaryTransporter, 7000);
  } catch (primaryErr) {
    const primaryPort = Number(process.env.SMTP_PORT || 587);
    const isNetworkTimeout =
      /timed out|timeout|ECONNREFUSED|ETIMEDOUT|ENETUNREACH|EHOSTUNREACH/i.test(primaryErr.message || '');

    if (primaryPort === 587 && isNetworkTimeout) {
      const fallbackTransporter = createTransporter(465, true);
      try {
        await sendWithTimeout(fallbackTransporter, 6000);
        return;
      } catch (fallbackErr) {
        throw new Error(
          'Outbound SMTP ports 587/465 timed out on this server. Configure BREVO_API_KEY (HTTPS port 443) or share the manual link below.'
        );
      }
    }
    throw primaryErr;
  }
};

/**
 * Unified delivery helper used by invitation & reset email functions.
 */
const deliverEmail = async ({ to, recipientName, subject, html }) => {
  if (!isEmailConfigured()) {
    return {
      configured: false,
      delivered: false,
      reason: 'Email delivery is not configured (set BREVO_API_KEY, RESEND_API_KEY, or SMTP_* env vars).',
    };
  }

  try {
    const sentViaApi = await sendViaHttpsApi({ to, recipientName, subject, html });
    if (!sentViaApi) {
      await sendMailViaSmtp({
        from: `"Man & Machine Fitness" <${getFromAddress()}>`,
        to,
        subject,
        html,
      });
    }
    return { configured: true, delivered: true };
  } catch (error) {
    return {
      configured: true,
      delivered: false,
      reason: error.message || 'Email delivery failed',
    };
  }
};

/**
 * Send Trainer Account Activation Invitation Email.
 * Never claims an email was delivered if unconfigured or delivery fails.
 */
const sendTrainerInvitation = async ({ to, trainerName, branchName, activationUrl, expiresInHours = 24 }) => {
  return deliverEmail({
    to,
    recipientName: trainerName,
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
};

/**
 * Send Password Reset Email.
 */
const sendPasswordResetEmail = async ({ to, userName, resetUrl, expiresInMinutes = 30 }) => {
  return deliverEmail({
    to,
    recipientName: userName,
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
};

module.exports = {
  isEmailConfigured,
  sendTrainerInvitation,
  sendPasswordResetEmail,
};
