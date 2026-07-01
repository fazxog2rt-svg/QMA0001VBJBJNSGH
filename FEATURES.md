# Status Fitur

Status jujur untuk setiap fitur yang diminta di spesifikasi. "implemented" berarti sudah
ada kode yang benar-benar berjalan end-to-end. "planned" berarti skema database dan/atau
struktur folder sudah disiapkan tapi command/logic belum ditulis — ini akan dikerjakan
bertahap sesuai urutan yang diminta (KTP → Profile → Leveling → Community → Tickets →
Moderation → Security → AI → Economy → Events → Testing → Optimasi → Dokumentasi).

## Fondasi (selesai)

| Item | Status |
|---|---|
| Struktur folder modular (commands/events/components/handlers/services/database/middlewares/utils/types/config/locales/logs) | implemented |
| Command handler (recursive loader, `src/handlers/commandHandler.ts`) | implemented |
| Event handler (recursive loader, `src/handlers/eventHandler.ts`) | implemented |
| Component handler — button/select/modal dengan prefix matching customId | implemented |
| Slash command deploy script (guild-scoped untuk dev, global untuk production) | implemented |
| Cooldown middleware per-command per-user | implemented |
| Permission middleware (`requiredPermissions`, `ownerOnly`) | implemented |
| Embed premium, pagination (button navigation), confirm dialog | implemented |
| Environment validation (zod) | implemented |
| Logger (winston, daily rotate file) | implemented |
| MongoDB connection (Mongoose) | implemented |
| Redis connection (ioredis) | implemented |
| i18n loader (i18next, locale default `id`) | implemented |
| Docker, Docker Compose (mongo+redis+bot), PM2 ecosystem | implemented |
| ESLint, Prettier, Husky + lint-staged, Vitest | implemented |
| Database schema inti (Member, IdentityCard, GuildConfig, ModerationCase, Ticket, ReactionRole, Giveaway, Reminder, Birthday, Suggestion, Confession, StarboardPost, TempVoiceChannel, ShopItem, CommunityEvent, ActivityLog, VerificationAttempt) | implemented |
| Command contoh: `/ping`, `/help` (pagination per kategori) | implemented |

## Belum dikerjakan (menunggu checkpoint tahap berikutnya)

Setiap modul berikut butuh command + business logic + (untuk beberapa) rendering
canvas/PDF. Skema database untuk semua ini sudah ada di `src/database/models/`.

- **Identitas Digital (KTP)** — `/ktp buat`, `/ktp lihat`, verifikasi admin, generate PNG/PDF, QR code
- **Profil Member** — `/profile`, edit bio/social media/pronouns, badge & achievement display
- **Leveling** — XP message/voice, rank card (canvas), leaderboard, role reward, prestige
- **Komunitas** — daily/weekly reward, reputation, poll, suggestion, starboard, birthday, reminder, AFK, confession, temp voice, welcome/goodbye card, auto role, reaction role
- **Tiket** — panel, claim/close/reopen, rating, transcript HTML/PDF
- **Moderasi** — warn/mute/timeout/kick/ban/tempban/softban/purge/lockdown
- **Keamanan** — anti-raid, anti-nuke, anti-spam, anti-scam, captcha, alt/VPN detection, audit log, backup/restore role
- **Utilitas tambahan** — QR generator, password generator, UUID generator, embed builder, calculator, JSON formatter
- **AI (OpenRouter)** — chat, translate, summarize, coding assistant, AI moderator, FAQ, prompt generator, grammar checker
- **Hiburan** — meme, trivia, truth or dare, would-you-rather, coinflip, dice, 8ball, pet, fishing, daily quest
- **Ekonomi** — wallet/bank, shop, inventory, transfer, leaderboard
- **Event komunitas** — RSVP, countdown, attendance, lucky draw, giveaway
- **Testing menyeluruh** per modul, optimasi (Redis cache di leaderboard/cooldown), dokumentasi command
