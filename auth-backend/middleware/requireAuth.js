const { verifySessionJWT } = require('../services/token');

// Use on any route that requires a logged-in user
// Reads from HttpOnly cookie first, falls back to Authorization: Bearer header
function requireAuth(req, res, next) {
  let token = req.cookies?.session_token;

  if (!token) {
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const user = verifySessionJWT(token);
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid session token.' });
  }
}

module.exports = { requireAuth };
