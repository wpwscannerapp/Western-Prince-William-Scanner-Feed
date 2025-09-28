# Welcome to your Dyad app

# Vite + React + Shadcn/UI + TypeScript

## Setup
1. Install dependencies: `npm install`
2. Run development server: `npm run dev`
3. Build for production: `npm run build`
4. Run tests: `npm run test` (after setting up Vitest)

## Environment Variables
Create a `.env` file in the root of your project with the following variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_MONTHLY_PRICE_ID`
- `VITE_APP_URL` (e.g., `http://localhost:8080` or your deployed URL)
- `VITE_ADMIN_EMAIL` (e.g., `admin@example.com`)
- `VITE_WEB_PUSH_PUBLIC_KEY` (for push notifications)

For Supabase Edge Functions and webhooks, you will also need to set these as secrets in your Supabase project dashboard:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WEB_PUSH_SECRET_KEY`