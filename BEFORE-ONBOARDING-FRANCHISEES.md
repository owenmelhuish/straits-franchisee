# Before Onboarding Franchisees

> Everything that must be updated, built, or configured before creating real franchisee accounts at scale (300+).

---

## 1. Current State Summary

The app works for a single developer testing all features. It is **not ready for real users**.

| Area | Current State | Problem at Scale |
|------|--------------|------------------|
| **Authentication** | Cookie-based role picker (`dev-role=admin` or `dev-role=franchisee`) | Any user can set any role — no identity verification |
| **User Identity** | Single hardcoded UUID `00000000-0000-0000-0000-000000000000` used everywhere | All 300+ franchisees share one identity — data overwrites and leaks |
| **Meta Tokens** | One token stored per hardcoded user row | Last franchisee to connect Meta overwrites everyone else's token |
| **Row Level Security** | RLS policies exist in Supabase but rely on `auth.uid()` which is always NULL | Policies are decorative — admin client bypasses them entirely |
| **Login Page** | Role selection buttons, no email/password | No way to identify who is using the app |

### Files with Hardcoded Dev User ID
These files all reference `00000000-0000-0000-0000-000000000000` and must be updated:

| File | Line | Usage |
|------|------|-------|
| `src/lib/dev-auth.ts` | 3 | Defines the constant |
| `src/app/api/meta/callback/route.ts` | 63 | Stores Meta token against this ID |
| `src/app/api/meta/launch-ad/route.ts` | 43 | Fetches Meta credentials using this ID |
| `src/app/api/meta/insights/route.ts` | 11 | Fetches analytics for this ID |
| `src/app/api/meta/status/route.ts` | 6 | Checks Meta connection status for this ID |
| `src/components/builder/builder-view.tsx` | 76 | Creates submissions under this ID |

### Files Using `getDevUser()` (Cookie-Based Auth)
These API routes use the dev auth helper which reads the role from a cookie with no verification:

- `src/app/api/submissions/route.ts`
- `src/app/api/templates/route.ts`
- `src/app/api/templates/[id]/route.ts`
- `src/app/api/psd/parse/route.ts`
- `src/app/api/upload/route.ts`
- `src/app/dashboard/history/page.tsx`
- `src/app/api/meta/insights/admin/route.ts` (reads cookie directly)

---

## 2. Meta App Developer Settings

### 2a. Production Redirect URI
The OAuth redirect URI is currently `http://localhost:3018/api/meta/callback`. For production:

1. **Deploy the app** to a production domain (e.g. `https://app.creativebuilder.com`)
2. In **Meta for Developers > App Settings > Basic**:
   - Add the production domain to **App Domains** (e.g. `app.creativebuilder.com`)
3. In **Facebook Login for Business > Settings**:
   - Add `https://app.creativebuilder.com/api/meta/callback` to **Valid OAuth Redirect URIs**
4. Update `.env.production`:
   ```
   META_REDIRECT_URI=https://app.creativebuilder.com/api/meta/callback
   ```

### 2b. Permission Scopes
The app currently requests these scopes (already configured in `src/app/api/meta/auth/route.ts`):
- `ads_management` — create and manage ads
- `ads_read` — read ad performance/insights
- `pages_read_engagement` — read page data
- `pages_show_list` — list pages the user manages

### 2c. App Review (Required for Live Mode with Real Users)
In development mode, only app admins/testers can authorize. For 300+ franchisees:

1. **Submit for App Review** in Meta for Developers
   - Each permission scope needs a screencast showing how it's used
   - Provide a test account Meta can use to verify
   - Explain the business use case (franchisees managing their own ads)
2. **Business Verification** — Meta may require verifying your business identity
   - Go to **Business Settings > Security Center** and complete verification
   - This can take 1-5 business days
3. Once approved, the app can be used by any Facebook user (not just testers)

### 2d. Rate Limits at Scale
With 300+ franchisees, be aware of Meta API rate limits:
- Standard rate limit: 200 calls per user per hour
- Ad Insights: 60 calls per account per hour
- The analytics page fetches insights per-ad — consider batching or caching for franchisees with many ads
- Add rate limit handling (HTTP 429) with exponential backoff in `src/lib/meta/client.ts`

---

## 3. Supabase Updates

### 3a. Enable Supabase Auth
Supabase Auth is already provisioned (the `auth.users` table exists and `profiles` references it), but it's not being used.

1. In **Supabase Dashboard > Authentication > Providers**:
   - Enable **Email** provider
   - Enable **Confirm email** (sends verification link on signup)
   - Configure **Redirect URLs** for password reset (e.g. `https://app.creativebuilder.com/reset-password`)

2. In **Supabase Dashboard > Authentication > Email Templates**:
   - Customize the **Confirm signup** email template (brand it to Creative Builder)
   - Customize the **Reset password** email template
   - Customize the **Invite user** email template (for admin-initiated onboarding)

3. In **Supabase Dashboard > Authentication > URL Configuration**:
   - Set **Site URL** to production domain
   - Add `http://localhost:3018` to **Redirect URLs** (for local dev)

### 3b. Fix Row Level Security (RLS)
The existing RLS policies in `supabase/migrations/001_initial_schema.sql` are correct but not functional because:
- All API routes use `createAdminClient()` (service role key) which **bypasses RLS entirely**
- `auth.uid()` returns NULL because no Supabase Auth session exists

**What needs to change:**
1. Create a **server-side authenticated Supabase client** that carries the user's session
2. Use the authenticated client for **user-initiated operations** (viewing own submissions, launching own ads)
3. Keep the admin client **only for admin operations** (viewing all franchisees, managing templates)

**Existing RLS policies that will work once auth is active:**
```sql
-- profiles: users see own profile, admins see all
-- submissions: users see own, admins see all
-- templates: anyone can read active, admins can write
-- storage: authenticated users can upload to exports bucket
```

### 3c. Profile Auto-Creation
When a new franchisee signs up, their `profiles` row needs to be created automatically.

**Option A: Database trigger** (recommended)
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'franchisee');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

**Option B: Admin invite flow** — admin creates profile first, then sends Supabase invite email. Franchisee clicks link, sets password, profile already exists.

### 3d. Meta Token Storage (Multi-Tenancy)
Currently, Meta tokens are stored directly on the `profiles` table:
- `meta_access_token`
- `meta_token_expires_at`
- `meta_ad_account_id`
- `meta_page_id`

This works at scale as long as each franchisee has one Meta ad account. If some franchisees have multiple ad accounts, consider a separate `meta_connections` table. For now, the current schema is sufficient.

### 3e. Token Expiry Monitoring
Add a way for admins to see which franchisees have expired tokens:

```sql
-- Query to find franchisees with expired or expiring tokens
SELECT full_name, email, meta_token_expires_at,
  CASE
    WHEN meta_token_expires_at < NOW() THEN 'EXPIRED'
    WHEN meta_token_expires_at < NOW() + INTERVAL '7 days' THEN 'EXPIRING SOON'
    ELSE 'ACTIVE'
  END as token_status
FROM profiles
WHERE meta_access_token IS NOT NULL
ORDER BY meta_token_expires_at ASC;
```

Consider a Supabase Edge Function or cron job to email franchisees when their token is about to expire (e.g. 7 days before).

---

## 4. Codebase Updates

### 4a. Replace Dev Auth with Supabase Auth

**Delete:** `src/lib/dev-auth.ts`

**Create:** `src/lib/auth.ts` — server-side helper to get the authenticated user from the Supabase session. This replaces every call to `getDevUser()` across the codebase.

Pattern using `@supabase/ssr`:
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { id: user.id, role: profile?.role ?? "franchisee" };
}
```

**Note:** The existing files `src/lib/supabase/client.ts` and `src/lib/supabase/server.ts` already have Supabase SSR client setup — reuse these.

### 4b. Rewrite Login Page
**File:** `src/app/(auth)/login/page.tsx`

Replace the role-picker buttons with a real login form:
- Email + password inputs
- "Sign in" button → calls `supabase.auth.signInWithPassword()`
- "Forgot password?" link → password reset flow
- Error handling for wrong credentials
- Redirect to `/dashboard` on success

### 4c. Build Signup Page (or Invite Flow)
**New file:** `src/app/(auth)/signup/page.tsx`

Two approaches:

**Open signup** (simpler):
- Email + password + name form
- `supabase.auth.signUp()` → sends verification email
- User verifies email → can log in
- Default role: `franchisee`

**Invite-only** (more controlled, recommended for franchise model):
- Admin creates account from admin dashboard
- `supabase.auth.admin.inviteUserByEmail()` sends invite
- Franchisee clicks link, sets password
- Profile pre-created with correct role and metadata

### 4d. Password Reset Flow
**New file:** `src/app/(auth)/reset-password/page.tsx`
- Email input → `supabase.auth.resetPasswordForEmail()`
- Callback page to set new password → `supabase.auth.updateUser({ password })`

### 4e. Update Middleware
**File:** `src/middleware.ts`

Replace cookie-based role check with Supabase session verification:
```typescript
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const supabase = createServerClient(/* ... */);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !isPublicRoute(pathname)) {
    return redirect("/login");
  }

  if (pathname.startsWith("/admin")) {
    // Check role from database, not cookie
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") return redirect("/dashboard");
  }
}
```

### 4f. Update All API Routes
Every API route that uses the hardcoded user ID or `getDevUser()` needs to:
1. Get the authenticated user from the Supabase session
2. Use that user's real ID for database queries
3. Return 401 if no session exists

**Files to update (in priority order):**

| File | Change |
|------|--------|
| `src/app/api/meta/callback/route.ts` | Replace hardcoded `userId` (line 63) with `user.id` from session |
| `src/app/api/meta/launch-ad/route.ts` | Replace hardcoded `userId` (line 43) with `user.id` from session |
| `src/app/api/meta/insights/route.ts` | Replace `DEV_USER_ID` (line 11) with `user.id` from session |
| `src/app/api/meta/status/route.ts` | Replace hardcoded ID (line 6) with `user.id` from session |
| `src/components/builder/builder-view.tsx` | Replace hardcoded ID (line 76) with user ID from auth context |
| `src/app/api/submissions/route.ts` | Replace `getDevUser()` with real auth |
| `src/app/api/templates/route.ts` | Replace `getDevUser()` with real auth |
| `src/app/api/templates/[id]/route.ts` | Replace `getDevUser()` with real auth |
| `src/app/api/psd/parse/route.ts` | Replace `getDevUser()` with real auth |
| `src/app/api/upload/route.ts` | Replace `getDevUser()` with real auth |
| `src/app/api/meta/insights/admin/route.ts` | Replace cookie role check with session-based role check |

### 4g. Client-Side Auth Context
The builder and dashboard components need to know the current user's ID. Create a React context/provider:

```typescript
// src/lib/auth-context.tsx
"use client";
import { createBrowserClient } from "@supabase/ssr";

// Provides user session to client components
// Used by builder-view.tsx and other client components that need user.id
```

### 4h. Admin Franchisee Management
**New page:** `src/app/admin/franchisees/page.tsx`

Admin needs to:
- View all franchisees (list from `profiles` table)
- See each franchisee's Meta connection status
- Invite new franchisees (trigger Supabase invite email)
- See token expiry status
- Disable/deactivate accounts if needed

---

## 5. Target Franchisee Onboarding Flow

### What the franchisee experiences:

```
1. Receives invite email from Creative Builder
   ↓
2. Clicks link → lands on signup page
   ↓
3. Sets their password → account created
   ↓
4. Logs in → sees dashboard with templates
   ↓
5. Clicks "Connect Meta Account" in Settings
   ↓
6. Facebook OAuth popup → grants permissions (one click if already logged into FB)
   ↓
7. Redirected back to Settings → "Connected" confirmation
   ↓
8. Can now: browse templates, build creatives, launch ads, view analytics
```

### What the admin does:

```
1. Goes to Admin > Franchisees
   ↓
2. Clicks "Invite Franchisee" → enters email + name
   ↓
3. System sends invite email
   ↓
4. Monitors connection status in Franchisees dashboard
   ↓
5. Views aggregate analytics across all connected franchisees
```

### Zero Backend Involvement for Franchisees
Franchisees should **never** need to:
- Access Meta Business Manager directly
- Copy/paste tokens or API keys
- Configure ad accounts manually
- Contact IT support to get connected

Everything is handled through the Creative Builder UI.

---

## 6. Token Lifecycle Management

### How Meta Tokens Work
1. **Short-lived token** (1-2 hours) — received during OAuth authorization
2. **Long-lived token** (60 days) — exchanged automatically in the callback (`src/app/api/meta/callback/route.ts` line 30)
3. **Cannot be refreshed silently** — Meta requires user interaction to re-authorize after 60 days

### Re-Authorization Flow
When a token expires:
1. Any API call using that token returns error code `190`
2. The app detects this and shows a "Reconnect" prompt to the franchisee
3. Franchisee clicks "Reconnect" → Facebook OAuth popup → one-click re-auth (Meta remembers previous permissions)
4. New 60-day token stored

### Proactive Token Management (Recommended)
- **7-day warning**: Send email to franchisees whose tokens expire within 7 days
- **Admin dashboard**: Show token status for all franchisees (active / expiring soon / expired)
- **In-app banner**: Show warning banner in dashboard when token expires within 7 days
- **Implementation**: Supabase Edge Function running on a daily cron schedule

---

## 7. Security & Compliance

### 7a. Session Security
- [ ] Use Supabase Auth JWT tokens (not cookies with arbitrary values)
- [ ] Sessions stored server-side with proper expiry
- [ ] Logout endpoint that clears session (`supabase.auth.signOut()`)
- [ ] Inactivity timeout for sensitive operations

### 7b. Role-Based Access Control
- [ ] Roles stored in `profiles.role` column (already exists)
- [ ] Every API route verifies role from database via auth session
- [ ] Admin routes double-check role on the server (don't trust client)
- [ ] Consider adding an `is_active` flag to profiles for deactivation without deletion

### 7c. Data Isolation
- [ ] RLS enforces that franchisees can only see their own submissions
- [ ] RLS enforces that franchisees can only see their own Meta connection status
- [ ] Admin client used only for admin-verified operations
- [ ] Franchisee A cannot access Franchisee B's data through API manipulation

### 7d. Meta Token Security
- [ ] Tokens stored in Supabase (encrypted at rest by default)
- [ ] Tokens never exposed to the client/browser
- [ ] Tokens only accessed server-side in API routes
- [ ] Consider additional encryption layer for `meta_access_token` column (pgcrypto)

### 7e. Error Handling
- [ ] Don't expose internal error details to clients (e.g. stack traces in Meta OAuth errors)
- [ ] Sanitize error messages in URL parameters (`meta_error` query param in callback)
- [ ] Log errors server-side with context for debugging

### 7f. Audit Logging (Optional, Recommended)
Track key actions for compliance:
- Who connected/disconnected Meta accounts
- Who launched ads (and for which campaigns)
- Who accessed which templates
- Admin actions (invites, deactivations)

---

## 8. Pre-Launch Checklist

### P0 — Blocking (Must Complete Before Any Real Accounts)

- [ ] **Supabase Auth enabled** with email provider and email verification
- [ ] **Real login page** with email + password (replaces role picker)
- [ ] **Signup/invite flow** for new franchisees
- [ ] **Middleware updated** to verify Supabase sessions (not cookies)
- [ ] **Hardcoded user ID removed** from all 6 files listed in Section 1
- [ ] **`getDevUser()` replaced** with real auth helper in all API routes
- [ ] **Meta OAuth callback** uses authenticated user ID (not hardcoded)
- [ ] **Profile auto-creation** trigger on signup
- [ ] **Production deployment** with real domain
- [ ] **Meta redirect URI** updated to production domain
- [ ] **`.env.production`** with production credentials

### P1 — High Priority (Complete Before Onboarding at Scale)

- [ ] **RLS enforcement** — switch from admin client to authenticated client for user operations
- [ ] **Admin franchisee management page** — view all franchisees, invite new ones, see statuses
- [ ] **Meta App Review submission** — get permissions approved for Live mode with real users
- [ ] **Meta Business Verification** — verify business identity with Meta
- [ ] **Password reset flow** — email-based password recovery
- [ ] **Error message sanitization** — don't expose internal errors to users
- [ ] **Rate limit handling** — handle Meta API rate limits with backoff

### P2 — Important (Complete Before Scaling Past ~50 Franchisees)

- [ ] **Token expiry email notifications** — warn franchisees before 60-day expiry
- [ ] **Token status admin dashboard** — show which franchisees need to reconnect
- [ ] **In-app reconnect banner** — proactive warning before token expires
- [ ] **Audit logging** — track who did what and when
- [ ] **Logout functionality** — proper session cleanup
- [ ] **Meta API response caching** — reduce API calls for analytics at scale
- [ ] **Batch insights fetching** — avoid per-ad API calls for franchisees with many ads

### P3 — Nice to Have

- [ ] Two-factor authentication for admin accounts
- [ ] Franchisee account deactivation (soft delete)
- [ ] Multiple Meta ad accounts per franchisee
- [ ] SSO integration for enterprise franchise networks
- [ ] API key management for webhook integrations
