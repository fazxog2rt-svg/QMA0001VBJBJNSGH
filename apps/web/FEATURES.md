# NexusBot Web — Feature / Page Inventory

Status legend: **Done** = real layout + real components + real `lib/api.ts` wiring (empty/error states included). **Done (catalog demo data)** = product catalog content intentionally sourced from `lib/demo-data.ts` per spec, with real API calls for the actions (install/apply/enable).

| Route | Purpose | Status |
|---|---|---|
| `/` | Marketing/landing page — hero, floating glass cards, animated stat counters, feature grid, CTA | Done |
| `/login` | Email/password + Discord/Google OAuth login, react-hook-form + zod | Done |
| `/register` | Account creation form, shared zod schema from `@nexusbot/shared` | Done |
| `/2fa` | TOTP 6-digit verification step (post-login MFA challenge) | Done |
| `/dashboard` | Home — bot status (online/ping/cpu/ram), server/user counts, command usage chart, realtime activity feed, announcements panel | Done |
| `/dashboard/servers` | Server picker grid — glass cards, icon, member count, premium tier badge, search filter | Done |
| `/dashboard/servers/[guildId]/overview` | Guild overview — member/message/voice/command stat cards, growth chart, realtime feed, server info | Done |
| `/dashboard/servers/[guildId]/moderation` | Case table with action-type filter + "issue action" modal (warn/mute/timeout/kick/ban/etc.) | Done |
| `/dashboard/servers/[guildId]/automod` | AutoMod rule toggles (anti-spam/raid/mention/link/invite/scam/phishing/token-grabber/captcha) | Done |
| `/dashboard/servers/[guildId]/economy` | Wallet leaderboard + member lookup by Discord user ID | Done |
| `/dashboard/servers/[guildId]/leveling` | XP leaderboard with progress bars + level-bracket distribution pie chart | Done |
| `/dashboard/servers/[guildId]/tickets` | Ticket list w/ status filter + threaded detail view + realtime message send | Done |
| `/dashboard/servers/[guildId]/identity-cards` | Identity card gallery (type/theme filters) + "generate card" dialog with live `CardPreview` | Done |
| `/dashboard/servers/[guildId]/analytics` | Growth, command usage, message activity, voice activity, XP distribution charts (all recharts, responsive) | Done |
| `/dashboard/servers/[guildId]/settings` | Guild config form — prefix/locale/timezone, welcome/goodbye messages, autoroles, feature toggles | Done |
| `/dashboard/servers/[guildId]/audit-logs` | Paginated audit log table | Done |
| `/dashboard/servers/[guildId]/webhooks` | Webhook CRUD table (create/enable-toggle/delete) | Done |
| `/dashboard/premium` | Plan comparison (Free/Premium/Premium+/Enterprise/Lifetime via `PREMIUM_LIMITS`), license/coupon redemption forms, invoice history | Done (Stripe checkout intentionally TODO'd per spec) |
| `/dashboard/marketplace` | Add-on catalog grid with install action | Done (catalog demo data) |
| `/dashboard/template-center` | Server template gallery with "apply to server" action | Done (catalog demo data) |
| `/dashboard/plugin-center` | Plugin catalog with enable/disable switches | Done (catalog demo data) |
| `/dashboard/settings` | Account settings — profile, 2FA QR setup, active sessions w/ revoke, API key CRUD | Done |
| `/admin` | Redirects to `/admin/stats` | Done |
| `/admin/users` | Platform users table, search, blacklist toggle | Done |
| `/admin/guilds` | Platform guilds table, search, blacklist toggle | Done |
| `/admin/premium` | License key + coupon generation forms, existing keys/coupons tables | Done |
| `/admin/announcements` | Announcement CRUD (create/publish-toggle/delete) | Done |
| `/admin/logs` | Platform-wide paginated audit log table | Done |
| `/admin/feature-flags` | Feature flag table with create + enable toggle | Done |
| `/admin/maintenance-mode` | Maintenance mode toggle + message editor | Done |
| `/admin/stats` | Platform-wide stat cards + growth/tier-distribution charts | Done |
| `/not-found` (404) | Styled glass 404 page | Done |
| `loading.tsx` (root, `dashboard`, `servers/[guildId]`, `admin`) | Skeleton loading states per route segment | Done |

## Notes for the orchestrator

- Auth cookie name assumed by `middleware.ts`: `nexus_access_token` (httpOnly, set by `apps/api`). If `apps/api` issues the access token cookie under a different name, update the `ACCESS_TOKEN_COOKIE` constant in `apps/web/middleware.ts` to match.
- `lib/api.ts` calls `${NEXT_PUBLIC_API_URL}/api/v1/...` with `credentials: 'include'`. Every page fetches through this client (or `lib/socket.ts` for realtime) — no hardcoded fake entity data lives in `app/**` or `components/**` outside `lib/demo-data.ts`.
- `lib/demo-data.ts` is scoped strictly to marketing/product catalog content (marketplace templates, plugin catalog, premium plan taglines, landing page copy) as instructed — never used for entity data that should come from the API.
- Assumed but unconfirmed API response shapes for a few endpoints without a finalized contract yet (guild analytics overview, admin platform stats, weekly command usage) — these are typed in `types/index.ts` / inline page interfaces and will need alignment once `apps/api` finalizes those routes. All calls fail gracefully to an empty state.
- `GET /auth/me` is assumed for the current-user hook (`hooks/use-current-user.ts`); adjust if `apps/api` names this route differently.
- Premium upgrade CTA intentionally does not wire real Stripe checkout (per instructions) — it has a `TODO(payments)` comment in `app/(dashboard)/dashboard/premium/page.tsx` pointing at where a checkout-session call should go.
- `npm run build` (Next 14 production build) and `npm run typecheck` both pass cleanly from `apps/web`.
