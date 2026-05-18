# kefri-tnms01

Authentication backend project with Google/GitHub OAuth plus email verification via magic link or OTP.

## Structure

- `auth-backend/` — Node.js/Express auth service

## Getting started

1. Copy the environment template:
   ```bash
   cd auth-backend
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```

## Helpful commands

- `npm run start:auth` — start auth backend from the repo root
- `npm run dev:auth` — start auth backend with `nodemon`
