# Western Prince William Scanner Feed

## Project Description
This is a real-time scanner feed application for Western Prince William incidents, featuring user authentication, premium subscriptions, and push notifications. Users can access real-time updates, manage their profiles, and administrators can manage posts, application settings, and send notifications.

## Setup
1.  **Clone the repository:**
    `git clone [your-repo-url]`
    `cd vite_react_shadcn_ts`
2.  **Install dependencies:**
    `npm install`
3.  **Environment Variables:**
    Create a `.env` file in the root of your project based on the `.env.example` provided.
4.  **Run development server:**
    `npm run dev`
5.  **Build for production:**
    `npm run build`
6.  **Run tests:**
    `npm run test` (after setting up Vitest)

## Environment Variables
Create a `.env` file in the root of your project with the following variables:
-   `VITE_SUPABASE_URL`
-   `VITE_SUPABASE_ANON_KEY`
-   `VITE_STRIPE_MONTHLY_PRICE_ID`
-   `VITE_APP_URL` (e.g., `http://localhost:8080` or your deployed URL)
-   `VITE_ADMIN_EMAIL` (e.g., `admin@example.com`)
-   `VITE_WEB_PUSH_PUBLIC_KEY` (for push notifications)
-   `VITE_SPLASH_DURATION` (e.g., `3000` for 3 seconds)
-   `VITE_POLL_INTERVAL` (e.g., `30000` for 30 seconds)
-   `VITE_SUPABASE_API_TIMEOUT` (e.g., `45000` for 45 seconds)
-   `VITE_MAX_CONCURRENT_SESSIONS` (e.g., `3`)
-   `VITE_AUTH_INITIALIZATION_TIMEOUT` (e.g., `20000` for 20 seconds)

For Supabase Edge Functions and webhooks, you will also need to set these as secrets in your Supabase project dashboard:
-   `STRIPE_SECRET_KEY`
-   `STRIPE_WEBHOOK_SECRET`
-   `SUPABASE_SERVICE_ROLE_KEY`
-   `WEB_PUSH_PRIVATE_KEY`

## Features Implemented

### Authentication
-   User signup and login with email/password
-   Password reset functionality
-   Admin role management

### Posts & Content
-   Real-time post updates with Supabase subscriptions
-   Image uploads for posts (with client-side resizing)
-   Post creation, editing, and deletion (admin only)
-   Post filtering and search in admin panel

### Social Features
-   Like posts
-   Comment on posts with editing/deletion capabilities
-   Real-time updates for likes and comments

### Subscription & Payments
-   Stripe integration for subscriptions
-   7-day free trial
-   Subscription status management
-   Idempotent Stripe webhooks

### Push Notifications
-   Web push notifications for subscribed users
-   Admin notification sender
-   Service worker implementation for offline support

### Admin Dashboard
-   Post management
-   Analytics dashboard with subscription growth charts
-   Application settings
-   Push notification sender
-   Contact settings management

### User Profiles
-   Profile management with avatar upload (with client-side resizing)
-   First/last name and username customization

### Incident Archive
-   Searchable and filterable archive of past incidents with infinite scrolling.

### Responsive Design
-   Mobile-friendly interface
-   Dark/light mode toggle

## Development

This project uses:
-   React with TypeScript
-   Vite for build tooling
-   Supabase for backend services
-   Tailwind CSS for styling
-   Shadcn/UI components
-   React Query for data fetching
-   Zod for form validation
-   React Hook Form for form handling

## Troubleshooting

### React Hook Order Errors
If you encounter errors like "Rendered more hooks than during the previous render," it typically means React's Rules of Hooks are being violated.
-   **Ensure Hooks are Unconditional:** All `useState`, `useEffect`, `useCallback`, `useMemo`, and custom hooks must be called at the top level of your React function components, before any conditional returns or loops.
-   **Check Conditional Rendering:** If a component conditionally renders other components that use hooks, ensure the parent component's hooks are still called consistently.

### "Loading User Permissions" Hang
If the application appears to hang on "Loading user permissions" or similar states for an extended period:
-   **Check Supabase Profile:** Ensure the authenticated user has an entry in the `public.profiles` table in your Supabase database. New users should have a profile created automatically, but manual intervention might be needed for existing users or if the `handle_new_user` trigger failed.
-   **Review RLS Policies:** Verify that the Row Level Security (RLS) policies on your `public.profiles` table allow authenticated users to `SELECT` their own profile data.
-   **Network Issues:** Check your browser's network tab for failed Supabase requests or timeouts.
-   **Environment Variables:** Confirm that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correctly set in your `.env` file.

### Authentication Issues in Production
If authentication works locally but fails in a deployed production environment:
-   **Supabase Redirect URLs:** Go to your Supabase project settings (`Authentication` -> `URL Configuration`) and add your production application URL (e.g., `https://your-app.com/*`) to the "Site URL" and "Redirect URLs" lists.
-   **Environment Variables:** Double-check that all `VITE_` environment variables (especially `VITE_APP_URL`) are correctly configured in your Netlify (or other hosting provider) environment settings.
-   **Browser Restrictions:** Some browsers might have stricter cookie or local storage policies in production. Ensure `persistSession: true` (which is the default for `@supabase/supabase-js`) is implicitly active.

### Blank Page on Load
If the app shows a blank page, especially in production:
-   **Console Errors:** Open your browser's developer console and look for JavaScript errors.
-   **Environment Variable Validation:** The app performs environment variable validation on startup. If any `VITE_` variables are missing, it will display an error message on the page. Check your `.env` file and deployment environment variables.
-   **Service Worker:** Ensure your `service-worker.js` is correctly registered and not causing issues. Clear site data in browser dev tools if necessary.