# Auth Backend

Node.js/Express authentication backend with:
- Google OAuth 2.0
- GitHub OAuth
- Email registration with **magic link** or **OTP** verification (2-minute TTL)
- HttpOnly cookie session management

---

## Setup

1. Copy the environment example:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the backend:
   ```bash
   npm start
   ```

> Use `npm run dev` if you want live reload through `nodemon`.

### Required `.env` values

- `PORT`
- `CLIENT_URL`
- `JWT_SECRET`
- `SESSION_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_CALLBACK_URL`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_SECURE`
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_FROM`

---

## API Reference

### OAuth

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/auth/google` | Redirect to Google consent screen |
| GET | `/auth/google/callback` | Google redirects here after consent |
| GET | `/auth/github` | Redirect to GitHub consent screen |
| GET | `/auth/github/callback` | GitHub redirects here after consent |

On success, both set an HttpOnly `session_token` cookie and redirect to `CLIENT_URL/dashboard`.

---

### Email Registration

#### `POST /auth/register`

Register a new user and trigger verification.

**Body:**
```json
{
  "name":   "Jane Doe",
  "email":  "jane@example.com",
  "method": "magic_link"   // or "otp"
}
```

**Magic link response:**
```json
{
  "message": "Magic link sent. It expires in 2 minutes.",
  "method":  "magic_link"
}
```

**OTP response:**
```json
{
  "message":             "OTP sent to your email. It expires in 2 minutes.",
  "method":              "otp",
  "verification_token":  "<jwt>"
}
```
> Store `verification_token` on the client — you'll send it back with the OTP the user enters.

---

#### `POST /auth/resend`

Resend a new magic link or OTP (generates a fresh 2-min token).

**Body:** Same as `/auth/register`.

---

### Verification

#### `GET /auth/verify/magic?token=<jwt>`

The link emailed to the user. On success, sets `session_token` cookie and redirects to dashboard.

| Redirect | Reason |
|----------|--------|
| `/dashboard?verified=true` | Token valid |
| `/verify-error?reason=expired` | 2 minutes elapsed |
| `/verify-error?reason=invalid_token` | Tampered token |

---

#### `POST /auth/verify/otp`

Submit the OTP the user typed in.

**Body:**
```json
{
  "verification_token": "<jwt from /auth/register>",
  "otp":               "847291",
  "name":              "Jane Doe"
}
```

**Success (200):**
```json
{
  "message":  "Email verified successfully.",
  "verified": true,
  "user": { "email": "jane@example.com", "name": "Jane Doe" }
}
```

Sets `session_token` cookie.

**Failure responses:**
- `401 OTP has expired` — `{ expired: true }`
- `401 Incorrect OTP`
- `400 Invalid token`

---

#### `GET /auth/verify/status?token=<jwt>`

Optional: check if a verification token is still valid.

```json
{
  "valid":          true,
  "type":           "otp",
  "email":          "jane@example.com",
  "remaining_ms":   87400,
  "remaining_secs": 87
}
```

---

### Session

#### `POST /auth/logout`

Clears the `session_token` cookie.

---

## Protecting Routes

```js
const { requireAuth } = require('./middleware/requireAuth');

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
```

The middleware reads the session token from:
1. `session_token` HttpOnly cookie (preferred)
2. `Authorization: Bearer <token>` header (fallback)

---

## Email Setup (Dev)

1. Go to https://ethereal.email → Create Account
2. Copy the SMTP credentials into `.env`
3. All sent emails appear in the Ethereal web inbox — no real emails sent

## Email Setup (Prod)

Swap to [Resend](https://resend.com) or SendGrid:
- Resend: set `EMAIL_HOST=smtp.resend.com`, port 587, user `resend`, pass = API key

---

## Security Notes

- Verification JWTs are **signed** — they can't be forged without the secret
- OTP is embedded in the JWT — no DB lookup required for validation
- Magic link token is single-use by design (JWT has no state; add a `used_tokens` store for true single-use)
- `session_token` is HttpOnly + Secure in production — not accessible via JavaScript
- Rate limiter on all `/auth/*` routes: 20 requests per 15 minuutes


<p align="center">
  <a href="#"><img src="https://github.com/Pantane1/nf/blob/main/public/ph.png" alt="ph-logo">
</p>

<p align="center">
  <a href="#"><img src="http://readme-typing-svg.herokuapp.com?color=ACAF50&center=true&vCenter=true&multiline=false&lines=LONG+LIVE+THE+NJAGI'S" alt="">
</p>