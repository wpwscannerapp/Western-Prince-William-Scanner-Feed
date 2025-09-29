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

## Features Implemented

### Authentication
- User signup and login with email/password
- Password reset functionality
- Admin role management

### Posts & Content
- Real-time post updates with Supabase subscriptions
- Image uploads for posts
- Post creation, editing, and deletion (admin only)
- Post filtering and search in admin panel

### Social Features
- Like posts
- Comment on posts with editing/deletion capabilities
- Real-time updates for likes and comments

### Subscription & Payments
- Stripe integration for subscriptions
- 7-day free trial
- Subscription status management

### Push Notifications
- Web push notifications for subscribed users
- Admin notification sender
- Service worker implementation for offline support

### Admin Dashboard
- Post management
- Analytics dashboard with subscription growth charts
- Application settings
- Push notification sender

### User Profiles
- Profile management with avatar upload
- First/last name customization

### Responsive Design
- Mobile-friendly interface
- Dark/light mode toggle

## Development

This project uses:
- React with TypeScript
- Vite for build tooling
- Supabase for backend services
- Tailwind CSS for styling
- Shadcn/UI components
- React Query for data fetching
- Zod for form validation
- React Hook Form for form handling