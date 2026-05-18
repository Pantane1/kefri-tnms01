const express = require('express');
const passport = require('passport');
const router = express.Router();

const { issueSessionJWT, issueVerificationToken, generateOTP } = require('../services/token');
const { sendMagicLink, sendOTP } = require('../services/email');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setSessionCookie(res, token) {
  res.cookie('session_token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// ─── Google OAuth ─────────────────────────────────────────────────────────────
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${CLIENT_URL}/login?error=oauth_failed` }),
  (req, res) => {
    const { user, token } = req.user;
    setSessionCookie(res, token);
    // Redirect to dashboard with basic user info in query (or use a short-lived handshake token)
    res.redirect(`${CLIENT_URL}/dashboard?name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}`);
  }
);

// ─── GitHub OAuth ─────────────────────────────────────────────────────────────
router.get('/github', passport.authenticate('github', { scope: ['user:email'], session: false }));

router.get('/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${CLIENT_URL}/login?error=oauth_failed` }),
  (req, res) => {
    const { user, token } = req.user;
    setSessionCookie(res, token);
    res.redirect(`${CLIENT_URL}/dashboard?name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}`);
  }
);

// ─── Email Registration ───────────────────────────────────────────────────────
// POST /auth/register
// Body: { name, email, method: 'magic_link' | 'otp' }
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, method } = req.body;

    if (!name || !email || !method) {
      return res.status(400).json({ error: 'name, email, and method are required.' });
    }
    if (!['magic_link', 'otp'].includes(method)) {
      return res.status(400).json({ error: 'method must be "magic_link" or "otp".' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    // TODO: Check if user already exists in your DB here
    // const existing = await db.findUserByEmail(email);
    // if (existing?.verified) return res.status(409).json({ error: 'Email already registered.' });

    if (method === 'magic_link') {
      // Issue a verification JWT (2 min TTL) and embed it in the link
      const token = issueVerificationToken(email, 'magic_link');
      await sendMagicLink(email, name, token);

      return res.status(200).json({
        message: 'Magic link sent. It expires in 2 minutes.',
        method:  'magic_link',
      });
    }

    if (method === 'otp') {
      const otp   = generateOTP(6);
      // Embed the OTP inside the short-lived JWT so the backend can verify it without a DB lookup
      const token = issueVerificationToken(email, 'otp', otp);
      await sendOTP(email, name, otp);

      return res.status(200).json({
        message:          'OTP sent to your email. It expires in 2 minutes.',
        method:           'otp',
        verification_token: token, // client stores this, sends it back with the OTP the user enters
      });
    }
  } catch (err) {
    next(err);
  }
});

// ─── Resend verification ───────────────────────────────────────────────────────
// POST /auth/resend
// Body: { name, email, method }
router.post('/resend', async (req, res, next) => {
  try {
    const { name, email, method } = req.body;
    if (!name || !email || !method) return res.status(400).json({ error: 'name, email, and method are required.' });

    if (method === 'magic_link') {
      const token = issueVerificationToken(email, 'magic_link');
      await sendMagicLink(email, name, token);
      return res.json({ message: 'New magic link sent.' });
    }

    if (method === 'otp') {
      const otp   = generateOTP(6);
      const token = issueVerificationToken(email, 'otp', otp);
      await sendOTP(email, name, otp);
      return res.json({ message: 'New OTP sent.', verification_token: token });
    }

    return res.status(400).json({ error: 'Invalid method.' });
  } catch (err) {
    next(err);
  }
});

// ─── Logout ───────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('session_token');
  res.json({ message: 'Logged out.' });
});

module.exports = router;
