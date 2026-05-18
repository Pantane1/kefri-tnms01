const nodemailer = require('nodemailer');

// ─── Transport ────────────────────────────────────────────────────────────────
// For production: swap these env vars for your SMTP provider (Resend, SendGrid, Postmark, etc.)
// For dev: use Ethereal (https://ethereal.email) — set EMAIL_HOST to smtp.ethereal.email
const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST   || 'smtp.ethereal.email',
  port:   parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const FROM = process.env.EMAIL_FROM || '"Auth App" <noreply@yourapp.com>';
const BASE_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// ─── Magic link email ─────────────────────────────────────────────────────────
async function sendMagicLink(email, name, token) {
  const link = `${BASE_URL}/verify?token=${token}&method=magic_link`;

  await transporter.sendMail({
    from:    FROM,
    to:      email,
    subject: 'Verify your email — link expires in 2 minutes',
    text: `Hi ${name},\n\nClick the link below to verify your account:\n${link}\n\nThis link expires in 2 minutes. If you did not sign up, ignore this email.`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"/></head>
      <body style="font-family:sans-serif;background:#0f0f13;color:#e2e2e2;margin:0;padding:40px 20px;">
        <div style="max-width:480px;margin:0 auto;background:#18181f;border:1px solid #2a2a35;border-radius:12px;padding:40px;">
          <h2 style="color:#fff;margin:0 0 8px;">Verify your email</h2>
          <p style="color:#9998b0;margin:0 0 28px;font-size:14px;">Hi ${name}, click below to confirm your account. This link expires in <strong style="color:#e2e2e2;">2 minutes</strong>.</p>
          <a href="${link}" style="display:inline-block;background:#5b5be6;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:0.3px;">
            Verify my account →
          </a>
          <p style="color:#555;font-size:12px;margin:28px 0 0;">Or copy this link:<br/><span style="color:#7f7fff;word-break:break-all;">${link}</span></p>
          <hr style="border:none;border-top:1px solid #2a2a35;margin:28px 0 16px;"/>
          <p style="color:#444;font-size:11px;margin:0;">If you did not request this, safely ignore this email.</p>
        </div>
      </body>
      </html>
    `,
  });
}

// ─── OTP email ────────────────────────────────────────────────────────────────
async function sendOTP(email, name, otp) {
  await transporter.sendMail({
    from:    FROM,
    to:      email,
    subject: `Your verification code: ${otp}`,
    text: `Hi ${name},\n\nYour one-time verification code is:\n\n${otp}\n\nIt expires in 2 minutes. Do not share this code with anyone.`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"/></head>
      <body style="font-family:sans-serif;background:#0f0f13;color:#e2e2e2;margin:0;padding:40px 20px;">
        <div style="max-width:480px;margin:0 auto;background:#18181f;border:1px solid #2a2a35;border-radius:12px;padding:40px;">
          <h2 style="color:#fff;margin:0 0 8px;">Your verification code</h2>
          <p style="color:#9998b0;margin:0 0 24px;font-size:14px;">Hi ${name}, enter the code below to verify your account. It expires in <strong style="color:#e2e2e2;">2 minutes</strong>.</p>
          <div style="background:#0f0f13;border:1px solid #2a2a35;border-radius:10px;padding:28px;text-align:center;margin:0 0 24px;">
            <span style="font-size:42px;font-weight:700;letter-spacing:14px;color:#fff;font-family:monospace;">${otp}</span>
          </div>
          <p style="color:#555;font-size:12px;margin:0 0 4px;">Do not share this code with anyone.</p>
          <hr style="border:none;border-top:1px solid #2a2a35;margin:24px 0 16px;"/>
          <p style="color:#444;font-size:11px;margin:0;">If you did not request this, safely ignore this email.</p>
        </div>
      </body>
      </html>
    `,
  });
}

module.exports = { sendMagicLink, sendOTP };
