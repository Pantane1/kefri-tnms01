const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const { verifyVerificationToken, issueSessionJWT } = require('../services/token');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

function setSessionCookie(res, token) {
  res.cookie('session_token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000,
  });
}

// ─── Magic link handler ───────────────────────────────────────────────────────
// GET /auth/verify/magic?token=<jwt>
// This is the URL the user clicks in their email
router.get('/magic', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.redirect(`${CLIENT_URL}/verify-error?reason=missing_token`);
  }

  try {
    const payload = verifyVerificationToken(token);

    if (payload.type !== 'magic_link') {
      return res.redirect(`${CLIENT_URL}/verify-error?reason=invalid_token`);
    }

    // TODO: In a real app — look up or create the user in your DB here
    // const user = await db.findOrCreateUser({ email: payload.email });
    // await db.markEmailVerified(user.id);

    // Construct user object from token payload
    const user = {
      id:       payload.email, // Replace with DB-assigned ID
      email:    payload.email,
      name:     payload.name || 'User',
      provider: 'email',
    };

    const sessionToken = issueSessionJWT(user);
    setSessionCookie(res, sessionToken);

    // Redirect to frontend dashboard
    return res.redirect(`${CLIENT_URL}/dashboard?verified=true&email=${encodeURIComponent(user.email)}`);

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.redirect(`${CLIENT_URL}/verify-error?reason=expired`);
    }
    return res.redirect(`${CLIENT_URL}/verify-error?reason=invalid_token`);
  }
});

// ─── OTP handler ──────────────────────────────────────────────────────────────
// POST /auth/verify/otp
// Body: { verification_token: <jwt>, otp: '123456', name: 'John' }
// The client sends back the verification_token it received during /auth/register
// plus the OTP the user typed in
router.post('/otp', async (req, res) => {
  const { verification_token, otp, name } = req.body;

  if (!verification_token || !otp) {
    return res.status(400).json({ error: 'verification_token and otp are required.' });
  }

  try {
    const payload = verifyVerificationToken(verification_token);

    if (payload.type !== 'otp') {
      return res.status(400).json({ error: 'Invalid token type.' });
    }

    // Constant-time comparison to prevent timing attacks
    const expectedOTP = payload.otp;
    if (!expectedOTP || otp.trim() !== expectedOTP) {
      return res.status(401).json({ error: 'Incorrect OTP. Please check your email.' });
    }

    // TODO: look up / create user in DB
    // const user = await db.findOrCreateUser({ email: payload.email, name });
    // await db.markEmailVerified(user.id);

    const user = {
      id:       payload.email,
      email:    payload.email,
      name:     name || 'User',
      provider: 'email',
    };

    const sessionToken = issueSessionJWT(user);
    setSessionCookie(res, sessionToken);

    return res.status(200).json({
      message:  'Email verified successfully.',
      verified: true,
      user: {
        email: user.email,
        name:  user.name,
      },
    });

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error:   'OTP has expired. Please request a new one.',
        expired: true,
      });
    }
    return res.status(400).json({ error: 'Invalid or malformed token.' });
  }
});

// ─── Token status check (optional — frontend can poll this) ───────────────────
// GET /auth/verify/status?token=<jwt>
router.get('/status', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required.' });

  try {
    const payload = verifyVerificationToken(token);
    const remainingMs = (payload.exp * 1000) - Date.now();
    return res.json({
      valid:          true,
      type:           payload.type,
      email:          payload.email,
      remaining_ms:   Math.max(0, remainingMs),
      remaining_secs: Math.max(0, Math.floor(remainingMs / 1000)),
    });
  } catch (err) {
    return res.json({
      valid:   false,
      expired: err.name === 'TokenExpiredError',
    });
  }
});

module.exports = router;
