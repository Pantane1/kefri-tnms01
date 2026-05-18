const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET     = process.env.JWT_SECRET     || 'change-me-in-production';
const SESSION_SECRET = process.env.SESSION_SECRET  || 'session-secret-change-me';

// ─── Session JWT (long-lived, returned after full verification) ───────────────
function issueSessionJWT(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, provider: user.provider },
    SESSION_SECRET,
    { expiresIn: '7d' }
  );
}

function verifySessionJWT(token) {
  return jwt.verify(token, SESSION_SECRET);
}

// ─── Verification token (short-lived, for magic link / OTP flow) ──────────────
// Payload: { email, type: 'magic_link' | 'otp', otp? }
// TTL: 2 minutes exactly
function issueVerificationToken(email, type, otp = null) {
  const payload = { email, type };
  if (type === 'otp' && otp) payload.otp = otp;
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '2m' });
}

function verifyVerificationToken(token) {
  // Throws JsonWebTokenError or TokenExpiredError on failure
  return jwt.verify(token, JWT_SECRET);
}

// ─── OTP ──────────────────────────────────────────────────────────────────────
function generateOTP(length = 6) {
  // Cryptographically random 6-digit OTP
  const bytes = crypto.randomBytes(4);
  const num   = bytes.readUInt32BE(0) % Math.pow(10, length);
  return String(num).padStart(length, '0');
}

// ─── Magic link token (URL-safe random bytes as the token id, wrapped in JWT) ─
function generateMagicToken(email) {
  const tokenId = crypto.randomBytes(32).toString('hex');
  const jwt     = issueVerificationToken(email, 'magic_link');
  return { tokenId, jwt };
}

module.exports = {
  issueSessionJWT,
  verifySessionJWT,
  issueVerificationToken,
  verifyVerificationToken,
  generateOTP,
  generateMagicToken,
};
