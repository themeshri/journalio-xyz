Looking at this guide against our Journalio codebase, here's the breakdown:

  Already Applying (Well-Aligned)                                              
   
  Rule: 2. Tailwind + shadcn/ui                                                
  Our Implementation: Using both extensively — Tailwind v4, shadcn New York
    style, Zinc base                 
  ────────────────────────────────────────                                     
  Rule: 6. Prisma + Managed Postgres
  Our Implementation: Prisma ORM with SQLite (dev) / PostgreSQL (prod)
  ────────────────────────────────────────
  Rule: 9. Sentry/Error Tracking
  Our Implementation: Sentry is set up (skipped in dev for perf)
  ────────────────────────────────────────
  Rule: 11. Secrets in .env
  Our Implementation: Environment variables for API keys, NextAuth secret, DB
    URL
  ────────────────────────────────────────
  Rule: 14. Radix + shadcn components
  Our Implementation: All UI primitives from shadcn/Radix
  ────────────────────────────────────────
  Rule: 16. Clean folders
  Our Implementation: Modular structure: lib/, components/, lib/contexts/,
    lib/analytics/, lib/server/
  ────────────────────────────────────────
  Rule: Don't write raw CSS
  Our Implementation: Tailwind throughout, no raw CSS
  ────────────────────────────────────────
  Rule: Don't write raw SQL
  Our Implementation: Prisma ORM exclusively
  ────────────────────────────────────────
  Rule: Don't hardcode API keys
  Our Implementation: All in .env files
  ────────────────────────────────────────
  Rule: Don't skip logging/monitoring
  Our Implementation: Sentry + ErrorBoundary
  ────────────────────────────────────────
  Rule: Document decisions
  Our Implementation: CLAUDE.md, FEATURES.md, DATA-STORAGE.md, MEMORY.md

  Partially Applying

  Rule: 1. Ready-made auth
  Status: Using NextAuth v4, but with a custom credentials provider
  (email-only,
    JWT) — not a full managed solution like Clerk/Supabase Auth. Works for now
    but no OAuth, no social login, no magic links
  Gap:
  ────────────────────────────────────────
  Rule: 3. State management
  Status: Using React Context (4-way split) instead of Zustand. It works but is

    more complex than Zustand would be. No Redux though
  Gap:
  ────────────────────────────────────────
  Rule: 5. Deploy with Vercel
  Status: Not clear from config if Vercel is the deploy target — next.config.js

    has outputFileTracingRoot but no explicit Vercel setup visible
  Gap:
  ────────────────────────────────────────
  Rule: 13. Preview deployments
  Status: Would come with Vercel, but unclear if enabled
  Gap:
  ────────────────────────────────────────
  Rule: 15. README
  Status: CLAUDE.md serves this role well, but there's no standard README.md
  for
    external contributors
  Gap:
  ────────────────────────────────────────
  Rule: Don't push straight to main
  Status: Using feature branches (currently on solanatracker), but no PR
    workflow visible
  Gap:

  Not Applying

  Rule: 4. tRPC / Server Actions
  Current State: Using custom REST API routes (/api/*) throughout — exactly
  what
    the guide warns against. 20+ hand-built endpoints
  Impact:
  ────────────────────────────────────────
  Rule: 7. Zod + React Hook Form
  Current State: No Zod validation visible, no React Hook Form. Form handling
  is
    manual
  Impact:
  ────────────────────────────────────────
  Rule: 8. Stripe for payments
  Current State: No payments at all (not needed yet)
  Impact:
  ────────────────────────────────────────
  Rule: 10. Analytics (PostHog/Plausible)
  Current State: No product analytics (user behavior tracking). We have trade
    analytics but no usage analytics
  Impact:
  ────────────────────────────────────────
  Rule: 12. UploadThing/Cloudinary
  Current State: No file upload functionality
  Impact:
  ────────────────────────────────────────
  Rule: 17. Onboarding + empty states
  Current State: No onboarding flow, unclear if empty states exist
  Impact:
  ────────────────────────────────────────
  Rule: 18. Lighthouse/Performance
  Current State: No evidence of Lighthouse audits or perf optimization beyond
    the Sentry/cache work
  Impact:
  ────────────────────────────────────────
  Rule: Don't build realtime
  Current State: Not applicable — no realtime features
  Impact:

  Key Takeaways

  Biggest gaps that would save time:
  1. Zod validation — we're accepting unvalidated inputs on 20+ API routes.
  This is a real risk
  2. Product analytics (PostHog) — we have zero visibility into how users
  interact with the app
  3. Onboarding/empty states — new users likely land on an empty dashboard with
   no guidance

  Intentional divergences (probably fine):
  - Custom REST APIs over tRPC — the app is already built this way, migrating
  would be costly with no clear benefit at this stage
  - React Context over Zustand — the 4-context split works, and switching is a
  large refactor for marginal gain
  - NextAuth credentials over Clerk — simpler for now, can upgrade later if
  social auth is needed

  Want me to prioritize any of these gaps for implementation?
