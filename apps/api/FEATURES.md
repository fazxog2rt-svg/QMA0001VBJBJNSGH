# NexusBot API — Implemented Features

`apps/api` is the Express + TypeScript REST API and Socket.IO realtime gateway for NexusBot. All
routes are mounted under `/api/v1` unless noted. Auth column legend:

- **Public** — no authentication required.
- **Cookie** — requires `requireAuth` (httpOnly `access_token` cookie or `Authorization: Bearer <jwt>`).
- **Cookie+Staff** — Cookie auth + `requireGuildStaff` (platform ADMIN/OWNER or a `GuildStaff` row for the guild).
- **Cookie+GuildAdmin** — Cookie auth + `requireGuildAdmin` (platform ADMIN/OWNER or `GuildStaff.role != MODERATOR`).
- **Cookie+PlatformAdmin** — Cookie auth + `requireRole('ADMIN','OWNER')`.
- **ApiKey** — `Authorization: Bearer nxb_...` via `apiKeyAuth` middleware.

All mutating (state-changing) cookie-authenticated routes additionally require the
`X-Requested-With` header (CSRF mitigation — see `src/middleware/auth.ts`) unless explicitly
exempted (payment webhook).

## Auth (`/auth`)

| Method | Path | Auth | Status |
|---|---|---|---|
| POST | /auth/register | Public | Implemented |
| POST | /auth/login | Public | Implemented (2FA-aware) |
| GET | /auth/discord | Public | Implemented |
| GET | /auth/discord/callback | Public | Implemented |
| GET | /auth/google | Public | Implemented |
| GET | /auth/google/callback | Public | Implemented |
| POST | /auth/2fa/setup | Cookie | Implemented |
| POST | /auth/2fa/verify | Cookie | Implemented |
| POST | /auth/2fa/disable | Cookie | Implemented |
| POST | /auth/refresh | Public (refresh cookie) | Implemented (rotation) |
| POST | /auth/logout | Cookie | Implemented |
| GET | /auth/sessions | Cookie | Implemented |
| DELETE | /auth/sessions/:id | Cookie | Implemented |

## Users (`/users`)

| Method | Path | Auth | Status |
|---|---|---|---|
| GET | /users/me | Cookie | Implemented |
| PATCH | /users/me | Cookie | Implemented |
| GET | /users/me/api-keys | Cookie | Implemented |
| POST | /users/me/api-keys | Cookie | Implemented (plaintext shown once) |
| DELETE | /users/me/api-keys/:id | Cookie | Implemented (revoke) |

## Guilds (`/guilds`)

| Method | Path | Auth | Status |
|---|---|---|---|
| GET | /guilds | Cookie | Implemented |
| GET | /guilds/:id | Cookie+Staff | Implemented |
| PATCH | /guilds/:id/settings | Cookie+GuildAdmin | Implemented |
| GET | /guilds/:id/members | Cookie+Staff | Implemented (paginated) |
| GET | /guilds/:id/staff | Cookie+Staff | Implemented |

## Moderation (`/guilds/:id/moderation`, `/guilds/:id/automod-rules`)

| Method | Path | Auth | Status |
|---|---|---|---|
| GET | /guilds/:id/moderation/cases | Cookie+Staff | Implemented (paginated, filter targetId/action) |
| POST | /guilds/:id/moderation/:action | Cookie+Staff | Implemented (warn/kick/ban/timeout/softban/tempban/unban — writes ModerationCase, publishes `nexus:bot-commands`, audit-logs, re-broadcasts realtime event) |
| GET | /guilds/:id/automod-rules | Cookie+Staff | Implemented |
| PUT | /guilds/:id/automod-rules/:ruleId | Cookie+Staff | Implemented |

## Economy (`/guilds/:id/economy`)

| Method | Path | Auth | Status |
|---|---|---|---|
| GET | /guilds/:id/economy/leaderboard | Cookie+Staff | Implemented |
| GET | /guilds/:id/economy/:memberId | Cookie+Staff | Implemented (profile + recent transactions) |
| POST | /guilds/:id/economy/:memberId/adjust | Cookie+GuildAdmin | Implemented (`TransactionType.ADMIN_ADJUST`) |

## Leveling (`/guilds/:id/leveling`)

| Method | Path | Auth | Status |
|---|---|---|---|
| GET | /guilds/:id/leveling/leaderboard | Cookie+Staff | Implemented |

## Tickets (`/guilds/:id/tickets`)

| Method | Path | Auth | Status |
|---|---|---|---|
| GET | /guilds/:id/tickets | Cookie+Staff | Implemented (filter by status) |
| GET | /guilds/:id/tickets/:ticketId | Cookie+Staff | Implemented (with messages) |
| POST | /guilds/:id/tickets/:ticketId/close | Cookie+Staff | Implemented |
| POST | /guilds/:id/tickets/:ticketId/messages | Cookie+Staff | Implemented |

## Identity Cards (`/guilds/:id/identity-cards`, `/identity-cards`)

| Method | Path | Auth | Status |
|---|---|---|---|
| POST | /guilds/:id/identity-cards | Cookie+Staff | Implemented |
| GET | /guilds/:id/identity-cards | Cookie+Staff | Implemented (paginated) |
| GET | /identity-cards/share/:slug | Public | Implemented (shareable card link) |
| POST | /identity-cards/:cardId/verify | Cookie+Staff (resolved via card's guild) | Implemented |

## Analytics (`/guilds/:id/analytics`)

| Method | Path | Auth | Status |
|---|---|---|---|
| GET | /guilds/:id/analytics/growth | Cookie+Staff | Implemented |
| GET | /guilds/:id/analytics/commands | Cookie+Staff | Implemented |
| GET | /guilds/:id/analytics/voice-activity | Cookie+Staff | Implemented |
| GET | /guilds/:id/analytics/realtime-summary | Cookie+Staff | Implemented (member count, open tickets, live bot ping/cpu/ram from Redis `bot:stats`) |

## Premium (`/premium`)

| Method | Path | Auth | Status |
|---|---|---|---|
| GET | /premium/plans | Public | Implemented |
| GET | /premium/subscription | Cookie | Implemented |
| POST | /premium/redeem-license | Cookie | Implemented |
| POST | /premium/redeem-coupon | Cookie | Implemented |
| GET | /premium/invoices | Cookie | Implemented |
| POST | /premium/webhook/payment | Public (provider signature — stub) | **Stub** — see controller comment; real Stripe/PayPal signature verification + idempotent Invoice/Subscription writes are future work |

## Webhooks (`/webhooks`)

| Method | Path | Auth | Status |
|---|---|---|---|
| GET | /webhooks | Cookie | Implemented |
| POST | /webhooks | Cookie | Implemented (secret shown once) |
| PATCH | /webhooks/:id | Cookie | Implemented |
| DELETE | /webhooks/:id | Cookie | Implemented |

## Admin (`/admin`, all Cookie+PlatformAdmin)

| Method | Path | Auth | Status |
|---|---|---|---|
| GET | /admin/users | Cookie+PlatformAdmin | Implemented (search + paginated) |
| PATCH | /admin/users/:id | Cookie+PlatformAdmin | Implemented (role, blacklist) |
| GET | /admin/guilds | Cookie+PlatformAdmin | Implemented (search + paginated) |
| PATCH | /admin/guilds/:id | Cookie+PlatformAdmin | Implemented (blacklist toggle, premium tier) |
| POST | /admin/announcements | Cookie+PlatformAdmin | Implemented |
| GET | /admin/audit-logs | Cookie+PlatformAdmin | Implemented (filter guildId/actorId, paginated) |
| GET | /admin/feature-flags | Cookie+PlatformAdmin | Implemented |
| PUT | /admin/feature-flags | Cookie+PlatformAdmin | Implemented (upsert) |
| GET | /admin/maintenance-mode | Cookie+PlatformAdmin | Implemented |
| PUT | /admin/maintenance-mode | Cookie+PlatformAdmin | Implemented |
| POST | /admin/license-keys | Cookie+PlatformAdmin | Implemented |
| POST | /admin/coupons | Cookie+PlatformAdmin | Implemented |
| GET | /admin/stats | Cookie+PlatformAdmin | Implemented (platform-wide totals) |
| GET | /admin/db/:model | Cookie+PlatformAdmin | Implemented — **allowlisted read-only** models only: `featureFlag`, `announcement`, `licenseKey`, `coupon`, `auditLog`, `guild` |
| POST | /guilds/:id/backup | Cookie+PlatformAdmin | Implemented (JSON snapshot of GuildSettings+AutoModRules+ReactionRoles) |
| GET | /guilds/:id/backups | Cookie+PlatformAdmin | Implemented |
| POST | /guilds/:id/backups/:backupId/restore | Cookie+PlatformAdmin | Implemented |

## Public developer API (`/public`, API-key authenticated)

| Method | Path | Auth | Status |
|---|---|---|---|
| GET | /public/bot/stats | ApiKey | Implemented |
| GET | /public/guilds/:id | ApiKey | Implemented |
| GET | /public/guilds/:id/leaderboard | ApiKey | Implemented (paginated) |

## Infra / cross-cutting

| Area | Status |
|---|---|
| `GET /health` | Implemented |
| `GET /docs` (Swagger UI) + `GET /docs.json` | Implemented, scans `@openapi` JSDoc blocks in every router |
| Socket.IO gateway (`src/lib/socket.ts`) | Implemented — JWT-authenticated handshake (cookie or `auth.token`), auto-joins `guild:<id>` rooms for guild staff + `admin:global` for ADMIN/OWNER, supports explicit `join-guild` event with server-side re-validation |
| Redis relay (`REDIS_EVENTS_CHANNEL` → Socket.IO) | Implemented in `startRealtimeRelay()`, fans out to guild room + admin room |
| Bot command channel (`nexus:bot-commands`) | Implemented — `publishBotCommand()` in `src/lib/redis.ts`, documented contract for the (independently-built) `apps/bot` consumer |
| JWT access/refresh + session rotation | Implemented (`src/lib/jwt.ts`, `src/modules/auth/service.ts`) |
| 2FA (TOTP + backup codes) | Implemented via `otplib` + `qrcode` |
| OAuth2 (Discord + Google) | Implemented via `axios` token exchange |
| RBAC middleware | Implemented (`requireAuth`, `requireRole`, `requireGuildStaff`, `requireGuildAdmin`) |
| API key auth | Implemented (`apiKeyAuth.ts`, SHA-256 hash lookup, revocation/expiry, `lastUsedAt`) |
| Rate limiting | Implemented, Redis-backed (`express-rate-limit` + `rate-limit-redis`), general + stricter `/auth/*` + very strict 2FA-verify tiers |
| CSRF protection | Implemented via `X-Requested-With` header guard (documented rationale in `src/middleware/auth.ts`) |
| Central error handler | Implemented, always returns `ApiErrorBody` JSON, hides stack traces outside dev |
| Maintenance mode gate | Implemented, 503 unless ADMIN/OWNER |
| Audit logging helper | Implemented (`writeAuditLog`), called from all mutating routes that matter |

## Explicitly out of scope / future work

- **Payment processor integration**: `POST /premium/webhook/payment` is a stub. Real work needed:
  Stripe/PayPal signature verification (`Stripe-Signature` header + webhook secret) before trusting
  the payload, idempotent Invoice/Subscription writes keyed on the provider's event id, and a real
  checkout-session-creation flow that stores the provider's customer/subscription id on `Subscription`.
- **Full DB admin UI**: only a safe, read-only, allowlisted `GET /admin/db/:model` exists. A full
  CRUD database browser, arbitrary model access, or query builder is intentionally not implemented.
- **Guild member/channel/role sync from Discord**: the API only reads what `apps/bot` has already
  written to Postgres (`GuildMember`, etc.); it does not call the Discord REST API directly for
  anything beyond OAuth2 identity exchange.
- **Webhook delivery worker**: `Webhook` rows are CRUD-managed here, but there is no outbound
  delivery/retry worker in `apps/api` — that would be a separate background service.
- **Email verification / password reset flows**: `User.emailVerified` exists in the schema and is
  set on OAuth login, but there's no email-based verification or password-reset endpoint yet.
