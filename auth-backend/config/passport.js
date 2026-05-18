const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const { issueSessionJWT } = require('../services/token');

// ─── Google ──────────────────────────────────────────────────────────────────
passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const user = {
      id:       profile.id,
      email:    profile.emails[0].value,
      name:     profile.displayName,
      avatar:   profile.photos?.[0]?.value || null,
      provider: 'google',
      verified: true, // OAuth accounts are pre-verified
    };
    const token = issueSessionJWT(user);
    return done(null, { user, token });
  } catch (err) {
    return done(err);
  }
}));

// ─── GitHub ───────────────────────────────────────────────────────────────────
passport.use(new GitHubStrategy({
  clientID:     process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL:  process.env.GITHUB_CALLBACK_URL || 'http://localhost:4000/auth/github/callback',
  scope: ['user:email'],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value || `${profile.username}@github.noemail`;
    const user = {
      id:       profile.id,
      email,
      name:     profile.displayName || profile.username,
      avatar:   profile.photos?.[0]?.value || null,
      provider: 'github',
      verified: true,
    };
    const token = issueSessionJWT(user);
    return done(null, { user, token });
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((data, done) => done(null, data));
passport.deserializeUser((data, done) => done(null, data));
