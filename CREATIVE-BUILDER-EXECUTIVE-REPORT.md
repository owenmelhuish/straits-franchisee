# Creative Builder — Executive Risk, Cost & Liability Report

> Prepared for CEO, CFO, CTO
> Date: March 19, 2026
> Scope: Security, infrastructure costs, operational risks, hidden fees, liability
> Assumption: All pre-launch items in `BEFORE-ONBOARDING-FRANCHISEES.md` have been completed. This report reflects a **live production system** serving 300+ franchisees.

---

## 1. Executive Summary

**Creative Builder** is a web application that enables franchise operators to create branded advertising creatives from corporate-approved templates and launch them directly to Meta (Facebook/Instagram) Ads — without needing design skills or direct access to Meta Ads Manager.

**Production state (post-hardening):**
- Supabase Auth with email/password login, invite-based onboarding, and email verification
- Row Level Security (RLS) enforced — franchisees can only access their own data
- Meta access tokens encrypted at rest with field-level encryption
- Audit logging for all sensitive operations
- Rate limiting on all API routes
- Meta App Review approved for Live mode
- Deployed to production domain with HTTPS

**External services (3 total):**

| Service | Role | Monthly Cost (300 users) |
|---------|------|--------------------------|
| Supabase | Database, auth, file storage | $300–600 |
| Meta Ads API | Ad creation + performance analytics | $0 (franchisees bear ad spend) |
| Hosting (Vercel or equivalent) | Application server | $50–100 |
| **Total platform cost** | | **$400–900/mo** |

**Overall assessment:**
- **Security: GOOD** — Industry-standard auth, encrypted tokens, RLS enforced, audit trail in place
- **Cost model: VIABLE** — Predictable infrastructure costs that scale linearly; franchisees bear their own ad spend; no per-seat vendor fees
- **Vendor risk: LOW-MEDIUM** — No proprietary lock-in on hosting or database; Meta integration is a necessary product dependency
- **Third-party data sharing: MINIMAL** — Data flows only to Meta (required for core functionality) and Supabase (our controlled backend). No analytics providers, tracking pixels, or other external services.

---

## 2. Architecture Overview (Production)

```
┌──────────────────────────────────────────────────────────────────┐
│                       CREATIVE BUILDER                            │
│                                                                    │
│  ┌──────────┐     ┌──────────────┐     ┌───────────────────────┐  │
│  │ Frontend  │────▶│  Next.js API  │────▶│      Supabase         │  │
│  │ (Browser) │     │   Routes      │     │  - PostgreSQL (RLS)   │  │
│  │           │     │  (Rate-limited)│     │  - Auth (JWT)         │  │
│  └──────────┘     └──────┬───────┘     │  - File Storage (S3)   │  │
│                          │              │  - Audit Logs          │  │
│                          │              └───────────────────────┘  │
│                          ▼                                          │
│                   ┌──────────────┐                                  │
│                   │  Meta Ads    │                                  │
│                   │  Graph API   │                                  │
│                   │  - OAuth     │                                  │
│                   │  - Campaigns │                                  │
│                   │  - Insights  │                                  │
│                   └──────────────┘                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Security layers in place:**

| Layer | Implementation |
|-------|---------------|
| **Authentication** | Supabase Auth — JWT sessions, email/password, invite-based onboarding |
| **Authorization** | Database-backed roles (admin/franchisee) verified on every API request |
| **Data isolation** | PostgreSQL RLS — franchisees can only read/write their own records |
| **Token security** | Meta OAuth tokens encrypted at field level (pgcrypto), never exposed to browser |
| **API protection** | Rate limiting on all routes, sanitized error responses |
| **Audit trail** | All sensitive operations logged (ad launches, Meta connections, admin actions) |

**Data flows:**
1. **Templates** — Admin uploads PSD designs → parsed into layers → stored in Supabase Storage
2. **Creatives** — Franchisee selects template + customizes → PNG generated server-side → stored in Supabase Storage
3. **Ads** — Franchisee launches creative → API creates campaign in Meta (PAUSED state) → ad IDs stored in Supabase
4. **Analytics** — Dashboard fetches performance data from Meta Insights API in real-time (not stored locally)

---

## 3. Security Posture

### 3.1 Controls in Place

| Control | Status | Detail |
|---------|--------|--------|
| **User authentication** | Active | Supabase Auth with email/password, email verification required |
| **Session management** | Active | JWT tokens with server-side validation, proper logout |
| **Role-based access control** | Active | Roles stored in database, verified on every API call |
| **Data isolation (RLS)** | Active | Franchisees cannot see other franchisees' submissions, tokens, or analytics |
| **Token encryption** | Active | Meta access tokens encrypted at rest using pgcrypto |
| **Tokens server-side only** | Active | Meta tokens never transmitted to or accessible from the browser |
| **HTTPS** | Active | All traffic encrypted in transit (production domain) |
| **Rate limiting** | Active | All API routes throttled to prevent abuse and cost spikes |
| **Audit logging** | Active | Ad launches, Meta connections, admin actions recorded |
| **Error sanitization** | Active | Internal error details logged server-side only, generic messages returned to client |
| **Invite-only onboarding** | Active | Admin controls who gets accounts — no open self-registration |

### 3.2 Residual Risks (Inherent to the System)

These risks cannot be fully eliminated — they are inherent to the product's design and dependencies:

| # | Risk | Severity | Detail | Mitigation in Place |
|---|------|----------|--------|-------------------|
| R1 | **Meta token grants broad access** | MEDIUM | The `ads_management` OAuth scope grants control over all ad accounts the franchisee has access to, not just one specific account | Tokens encrypted, server-side only, audit logged. Franchisee authorizes scope during OAuth. |
| R2 | **60-day token expiry requires re-auth** | LOW | Meta does not support silent token refresh. Every 60 days, each franchisee must re-authorize via a one-click OAuth prompt. | Proactive email reminders at 7 days before expiry. In-app banner. Admin dashboard shows token status. |
| R3 | **Database breach exposes encrypted tokens** | LOW | If Supabase is compromised, encrypted tokens could theoretically be decrypted if the encryption key is also compromised | Field-level encryption with separate key management. Supabase encrypts at rest by default. Breach response plan in place. |
| R4 | **Ads created on franchisee's behalf** | MEDIUM | The platform acts as an agent creating ads in the franchisee's Meta account. If the platform creates a non-compliant ad, liability may attach. | Ads created in PAUSED state. Franchisee must activate. Audit log records who launched what. |
| R5 | **Meta API changes or access revocation** | LOW | Meta could change API terms, deprecate endpoints, or revoke app access | API versioned (v25.0), deprecation notices given 2+ years ahead. Code abstracted for version migration. |

### 3.3 What We Do NOT Do

Important negatives for the risk profile:
- We do **not** store credit card or payment information
- We do **not** process financial transactions (ad spend goes directly from franchisee to Meta)
- We do **not** share data with any third party other than Meta
- We do **not** use analytics/tracking services (no Google Analytics, Segment, Hotjar, etc.)
- We do **not** store ad performance data persistently (fetched from Meta on-demand)
- We do **not** have access to franchisee Facebook accounts beyond the specific scopes they authorize

---

## 4. Cost Analysis

### 4.1 Infrastructure Costs by Scale

| Component | 100 Franchisees | 300 Franchisees | 1,000 Franchisees | 3,000 Franchisees |
|-----------|----------------|-----------------|-------------------|--------------------|
| **Supabase** (DB + Auth + Storage) | $150–300/mo | $300–600/mo | $1,000–2,500/mo | $2,500–5,000/mo |
| **Hosting** (Vercel or equivalent) | $20–50/mo | $50–100/mo | $100–300/mo | $300–800/mo |
| **Bandwidth / Egress** | $20–50/mo | $50–200/mo | $200–500/mo | $500–1,500/mo |
| **Email** (Supabase built-in for auth) | $0 | $0 | $0–50/mo | $50–100/mo |
| **Meta Ads API** | $0 | $0 | $0 | $0 |
| **Total Platform Cost** | **$190–400/mo** | **$400–900/mo** | **$1,300–3,350/mo** | **$3,350–7,400/mo** |
| **Per-franchisee cost** | **$1.90–4.00** | **$1.33–3.00** | **$1.30–3.35** | **$1.12–2.47** |

### 4.2 What Franchisees Pay (Not Platform Cost)

- **Ad spend is borne entirely by each franchisee** through their own Meta Ads account
- The platform transmits budget amounts to Meta but does not process or touch any money
- Each franchisee controls their own ad budget (set during creative launch)
- Creative Builder creates campaigns in **PAUSED** state — franchisees activate when ready
- Typical ad budget per franchisee: $50–500 per campaign (set by the franchisee, paid by the franchisee directly to Meta)
- **The platform has zero financial liability for ad spend**

### 4.3 Supabase Plan Tiers (Key Threshold)

| Plan | Price | Included | When You Hit It |
|------|-------|----------|-----------------|
| **Pro** | $25/mo | 8GB DB, 100GB storage, 50GB bandwidth | Starting point |
| **Team** | $599/mo | 16GB DB, 200GB storage, 250GB bandwidth | ~200-500 franchisees depending on usage |
| **Enterprise** | Custom | Custom limits | 1,000+ franchisees |

The jump from **Pro ($25/mo) to Team ($599/mo)** is the most significant tier threshold. Plan for this at approximately 200-500 active franchisees.

### 4.4 What Is NOT a Cost

| Item | Why It's Free |
|------|---------------|
| Meta Ads API access | Free for approved apps — no per-call charges |
| Meta Insights (analytics) | Free — included in API access |
| OAuth authentication flow | Free — Meta provides this at no cost |
| Template creation | Internal admin activity — no external cost |
| PNG generation | Server-side compute on hosting plan (included) |

---

## 5. Hidden Fees & Variable Cost Risks

| Risk | Description | Likelihood | Potential Monthly Impact | Mitigation |
|------|-------------|------------|--------------------------|------------|
| **Supabase tier jump** | Crossing from Pro ($25) to Team ($599) when DB or storage exceeds Pro limits | Certain at ~200-500 users | +$574/mo step increase | Monitor usage, plan for jump, budget accordingly |
| **Storage bandwidth spikes** | Franchisees sharing creative download links externally or frequent re-downloads | Medium | +$100–500/mo | CDN caching in front of Supabase Storage |
| **Meta API rate limits** | Analytics page makes per-ad API calls. A franchisee with 50 ads triggers 100+ API calls per page load. At 300+ franchisees loading analytics simultaneously, rate limits may be hit. | Medium at 300+ users | No direct cost, but degraded service | Response caching (cache insights for 15-60 min), batch API calls |
| **Hosting bandwidth overage** | Vercel charges ~$0.50/GB beyond plan limits | Low-Medium | +$50–200/mo | Monitor, upgrade plan tier proactively |
| **Submissions table growth** | Each creative generation creates a DB row. 300 franchisees × 10 creatives/month = 3,000 rows/month, 36,000/year | Certain | Gradual DB size increase | Data retention policy, archive old submissions |
| **Auth email volume** | Password resets, invite emails, verification — Supabase includes email in plan but has limits | Low | $0–50/mo for external email provider | Monitor volume, switch to SendGrid/Resend if needed |

---

## 6. Liability & Compliance

### 6.1 Data Privacy

| Area | Production State | Residual Risk |
|------|-----------------|---------------|
| **PII stored** | Email, full name per franchisee | Standard — minimal PII footprint |
| **Sensitive credentials** | Meta OAuth tokens (encrypted at rest) | Breach requires both DB access AND encryption key |
| **Data Processing Agreement** | Supabase DPA executed | Covered |
| **Data retention** | Policy defined; old submissions archived/purged on schedule | Manageable ongoing obligation |
| **Right to deletion** | Account deletion workflow removes profile + submissions + revokes Meta token | GDPR Article 17 compliant |
| **Data location** | Supabase region selected (known); Meta processes data globally per their terms | Standard for Meta-integrated apps |
| **Data sharing** | Only with Meta (required for core functionality). No other third parties. | Minimal exposure surface |

### 6.2 Advertising Liability

| Area | Production State | Residual Risk |
|------|-----------------|---------------|
| **Ad creation authority** | Platform creates campaigns using franchisee's Meta account via OAuth | Platform is an agent acting on franchisee's explicit authorization |
| **Ad state** | All ads created in **PAUSED** state | Franchisee must explicitly activate — no automatic spend |
| **Consent trail** | Audit log records: who launched, what creative, what copy, what budget, when | Documented proof of franchisee-initiated action |
| **Ad content compliance** | Templates are corporate-approved; franchisees customize within template constraints | Risk of non-compliant ad copy in text fields (headline, body) |
| **Token scope** | `ads_management` grants broad control over franchisee's ad accounts | Standard scope for ad management apps; franchisee authorizes explicitly |

**Key liability position:** Creative Builder is a **tool** that franchisees use to create and submit ads. The franchisee authorizes the Meta connection, selects the template, writes the copy, sets the budget, and activates the ad. The audit trail documents each of these actions. The platform does not autonomously spend money or publish content.

### 6.3 Financial Exposure Scenarios

| Scenario | Exposure | Likelihood | Mitigations |
|----------|----------|------------|-------------|
| **Encrypted token breach → unauthorized ad spend** | Limited — attacker needs DB access + encryption key + Meta token still valid (60-day window) | Very Low | Encryption, key separation, breach response plan, Meta's own fraud detection |
| **Franchisee disputes an ad they launched** | Low — audit log proves franchisee initiated the launch | Low | Audit trail with timestamps, user ID, creative details |
| **Meta revokes API access** | All franchisees lose ability to launch ads and view analytics until restored | Low | Maintain App Review compliance, monitor Meta communications |
| **Supabase data loss** | Templates and submissions lost | Very Low | Daily automated backups, off-site backup copies, documented restore procedure |
| **Non-compliant ad copy published under franchise brand** | Brand/legal risk if franchisee writes problematic ad text | Medium | Template constraints limit customization. Consider optional admin approval workflow for ad copy. |

### 6.4 What We Are NOT Liable For

- **Ad spend** — Franchisees pay Meta directly from their own ad accounts. We never touch money.
- **Ad performance** — We provide the tool; campaign results depend on the franchisee's targeting, budget, and creative choices.
- **Meta platform issues** — Ad delivery, billing, and policy enforcement are Meta's responsibility.
- **Franchisee's Meta account** — We only access what the franchisee explicitly authorizes. They can revoke access at any time from their Facebook settings.

---

## 7. Vendor Dependencies & Lock-In

### 7.1 Summary

| Vendor | Lock-in | Portability | Risk |
|--------|---------|-------------|------|
| **Supabase** | MEDIUM | PostgreSQL underneath — can migrate to AWS RDS, Google Cloud SQL, or any managed Postgres. Storage is S3-compatible. Auth would need migration work. | Well-funded (Series B), growing platform. Data exportable via `pg_dump`. |
| **Meta Ads API** | NECESSARY | Cannot replace — product requires Facebook/Instagram ad placement. No alternative API exists for this. | Meta could change terms, pricing, or access policies. API versioned annually with 2+ year deprecation notice. |
| **Hosting (Vercel)** | LOW | Standard Next.js app — runs on any Node.js host (AWS, Cloudflare, Railway, Docker). | Trivial to migrate. No Vercel-specific features used. |

### 7.2 Meta API Dependency (Detailed)

Since Meta is the most critical and least replaceable dependency:

| Factor | Detail |
|--------|--------|
| **API version** | Currently v25.0. Meta releases new versions annually. |
| **Deprecation policy** | Old versions supported for at least 2 years after deprecation |
| **App Review** | Approved — permissions verified by Meta for production use |
| **Business Verification** | Completed — identity confirmed with Meta |
| **Rate limits** | 200 calls/user/hour (standard), 60 calls/account/hour (insights). Sufficient for 300 franchisees with caching. |
| **Alternative platforms** | Google Ads API could extend reach but is a separate product, not a Meta replacement |
| **Worst case** | Meta revokes access → all ad functionality offline. Templates and creative generation still work. |

---

## 8. Disaster Recovery & Business Continuity

| Risk Event | Probability | Impact | Mitigation | Recovery Time |
|------------|-------------|--------|------------|---------------|
| **Supabase outage** | Low (99.9% SLA) | HIGH — app non-functional | Daily backups, documented restore procedure | 1–4 hours (Supabase restores) |
| **Hosting outage** | Low | MEDIUM — app offline | CI/CD pipeline, can redeploy to alternative host | 30–60 min |
| **Meta API outage** | Low | MEDIUM — ad launch + analytics offline. Creative generation still works. | Graceful degradation (show cached data, queue ad launches) | Depends on Meta |
| **Meta API version deprecation** | Medium (annual) | LOW if managed | Track deprecation notices, plan migration quarterly | Days to weeks (planned) |
| **Token compromise** | Very Low | HIGH — affected ad accounts exposed | Encrypted tokens, key rotation, breach response plan. Can mass-revoke via Meta. | Hours to contain, days to re-auth all franchisees |
| **Data loss** | Very Low | HIGH | Supabase daily backups, off-site copies | Hours to restore from backup |
| **Key personnel departure** | Medium | MEDIUM | Codebase documented, standard architecture (Next.js + Supabase) | New developer productive in 1–2 weeks |

---

## 9. Ongoing Operational Requirements

### 9.1 Recurring Tasks

| Task | Frequency | Owner | What Happens If Missed |
|------|-----------|-------|----------------------|
| **Monitor token expiry** | Daily (automated) | System + Ops | Franchisees lose ad functionality after 60 days. Automated emails handle this. |
| **Review Supabase billing** | Monthly | Finance / DevOps | Unexpected cost spikes from storage or bandwidth |
| **Check Meta API deprecation notices** | Quarterly | Engineering | Risk of broken API calls when old version sunset |
| **Review audit logs** | Weekly | Admin / Security | Missed unauthorized access or anomalous activity |
| **Database maintenance** | Monthly | Engineering | Submissions table grows indefinitely without cleanup |
| **Backup verification** | Monthly | DevOps | Discover backup failures before they're needed |
| **Rotate encryption keys** | Annually | Security | Reduced security posture over time |
| **Update dependencies** | Monthly | Engineering | Security vulnerabilities in outdated packages |

### 9.2 Franchisee Support Expectations

| Issue | Frequency (est.) | Resolution |
|-------|-------------------|------------|
| "I need to reconnect my Meta account" | ~5% of franchisees per month (token expiry) | Self-service: click "Reconnect" in Settings |
| "I forgot my password" | ~1–2% per month | Self-service: email-based password reset |
| "My ad isn't delivering" | Variable | Not a platform issue — this is Meta Ads delivery. Direct to Meta support or internal marketing team. |
| "I can't see my analytics" | Rare (tied to token expiry) | Reconnect Meta account |

### 9.3 Key Metrics to Monitor

| Metric | Alert Threshold | Frequency |
|--------|-----------------|-----------|
| Supabase database size | > 80% of plan limit | Daily |
| Supabase storage bandwidth | > 70% of plan limit | Daily |
| Meta API error rate | > 5% of requests | Hourly |
| Franchisee tokens expiring within 7 days | Any (triggers email) | Daily |
| Failed API requests | > 100/day | Hourly |
| Monthly infrastructure cost | > 120% of previous month | Monthly |
| Franchisees with expired Meta tokens | > 10% of connected users | Weekly |
| Audit log anomalies | Unusual admin activity or bulk operations | Daily |

---

## 10. Summary for Decision-Makers

### For the CEO

Creative Builder is a production-ready platform that solves a clear business problem — enabling 300+ franchise operators to create and launch branded ads without design skills or Meta Ads Manager expertise. The security foundation is solid: real authentication, encrypted credentials, data isolation between franchisees, and a full audit trail. The main ongoing requirement is managing Meta's 60-day token cycle (automated email reminders handle this). The platform creates ads in a **paused state**, meaning no money is ever spent without the franchisee explicitly activating the campaign. The primary dependency risk is Meta — if Meta changes API terms or access, ad functionality is affected, though creative generation continues independently.

### For the CFO

Infrastructure costs are **predictable and modest**: approximately **$400–900/month at 300 franchisees**, scaling to **$1,300–3,350/month at 1,000**. Per-franchisee cost decreases with scale (~$1.30–3.00/user/month at 1,000 users). **Franchisees bear their own ad spend** — the platform never handles money. There are **no per-seat licensing fees** from any vendor. The most significant cost event is the **Supabase tier jump from Pro ($25/mo) to Team ($599/mo)**, which occurs at approximately 200–500 active franchisees — plan for this in the budget. The Meta Ads API is free. The biggest financial risk scenario — a token breach leading to unauthorized ad spend — is mitigated by encryption, server-side-only token handling, and Meta's own fraud detection systems. There is **no ongoing liability for franchisee ad spend**.

### For the CTO

The architecture is standard, well-structured, and portable: Next.js 16 + Supabase (PostgreSQL) + Meta Graph API v25.0. Vendor lock-in is low — the database is standard Postgres (portable via `pg_dump`), hosting is standard Next.js (runs anywhere), and Meta is a necessary dependency, not a lock-in choice. Security posture is solid post-hardening: JWT-based auth, RLS-enforced data isolation, field-level token encryption, rate limiting, and audit logging. The codebase is clean and uses direct `fetch()` calls to Meta (no heavy SDK dependency). Residual risks are inherent to the product model: Meta's 60-day token lifecycle requires periodic user interaction (cannot be automated), and Meta API versions require annual migration attention. The system handles 300 franchisees comfortably within standard API rate limits; scaling beyond 1,000 may require insights response caching and batch API strategies. No fundamental architectural changes are needed for the foreseeable roadmap.

---

*Report based on source code analysis of the Creative Builder codebase and assumes completion of all items documented in `BEFORE-ONBOARDING-FRANCHISEES.md`. All cost estimates are based on published vendor pricing as of March 2026.*
