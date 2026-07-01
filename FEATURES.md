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

## Identitas Digital (KTP) — Stage 8 (selesai)

| Feature | Status | Catatan |
|---|---|---|
| `/ktp buat` — wizard multi-step (modal → modal → select×3 → confirm) | implemented | Draft disimpan di Redis (`ktpSession.ts`, TTL 15 menit) selama pengisian |
| Validasi NIK (16 digit), tanggal lahir (DD-MM-YYYY, kalender valid, tidak di masa depan), kode pos (5 digit) | implemented | `ktpValidation.ts` |
| Nomor identitas unik otomatis (`KTP-<tahun>-<8 digit>`) | implemented | Counter atomik (`Counter.ts`, `$inc` findOneAndUpdate — aman dari race condition) |
| Upload foto opsional via slash command attachment, fallback ke avatar Discord | implemented | |
| Generate kartu PNG (canvas premium, badge status berwarna, disclaimer non-resmi) | implemented | `ktpCardRenderer.ts` — diverifikasi visual, ada fallback foto abu-abu jika load gambar gagal |
| QR verification + barcode Code128 | implemented | `ktpCodeRenderer.ts` (qrcode + bwip-js) |
| Generate PDF (A4, tidak ada elemen overlap — diverifikasi visual) | implemented | `ktpPdfRenderer.ts` |
| Riwayat perubahan data (`/ktp riwayat`, paginated) | implemented | |
| Verifikasi/tolak oleh admin (`/ktp verifikasi`, `/ktp tolak`, permission Manage Server, DM notifikasi best-effort) | implemented | |
| Masa berlaku (2 tahun sejak diterbitkan/diperbarui) | implemented | |
| Kewarganegaraan | simplified | Default "WNI" (tidak ada input UI) — modal Discord dibatasi 5 field × 2 modal sudah terisi penuh oleh 10 field lain. Bisa ditambahkan sebagai select menu ke-4 di iterasi berikutnya jika dibutuhkan. |
| Privasi | by design | `/ktp lihat` untuk user lain dibatasi ke admin (Manage Server) saja — data berbentuk NIK/alamat tidak ditampilkan bebas ke publik meski datanya fiktif/community-only. |

## Member Profile — Stage 9 (selesai)

| Feature | Status | Catatan |
|---|---|---|
| `/profile lihat [user]` — kartu profil canvas (avatar, banner, bio, badge chip, XP bar, stats) | implemented | `profileCardRenderer.ts` — diverifikasi visual, badge dirender sebagai chip teks (bukan emoji, karena font emoji tidak tersedia lintas platform di `@napi-rs/canvas`) |
| `/profile edit [banner]` — modal (bio, pronouns, warna favorit, media sosial) di-prefill dari data saat ini | implemented | Banner via attachment option (pola sama seperti KTP), field lain via modal |
| Parsing media sosial dari textarea `Platform: handle` per baris ke `Map` | implemented | `profileService.ts` |
| `/profile achievements` — progres achievement berbasis counter yang sudah ada di skema Member | implemented | Progress akan otomatis terisi begitu stage Leveling/Tickets/AI/Economy menulis counter-nya |
| `/badge beri` / `/badge cabut` (admin, Manage Server) | implemented | Entry point manual untuk badge system; pemberian otomatis (mis. saat boost) menyusul di stage terkait |
| Reputation, XP/Level display | implemented (read-only) | Nilainya masih 0 sampai stage Leveling/Komunitas menulis counter-nya — ini disengaja, bukan bug |

## Leveling — Stage 10 (selesai)

| Feature | Status | Catatan |
|---|---|---|
| XP dari pesan (cooldown 60 detik, 15-25 XP acak) | implemented | `messageCreate.ts` + `awardMessageXp()`; `messageCount` naik di setiap pesan terlepas dari cooldown XP |
| XP dari voice (5 XP/menit) | implemented | `voiceStateUpdate.ts`, sesi dilacak di memori (`client.voiceSessions`), channel AFK guild dikecualikan |
| XP Event (bonus manual) | implemented | `/xp beri` (admin) — juga bisa untuk mengurangi XP (nilai negatif) |
| `/rank [user]` — kartu rank canvas (avatar, rank #, level/prestige, XP bar) | implemented | `rankCardRenderer.ts` — diverifikasi visual |
| `/leaderboard` — papan peringkat XP, paginated (maks 5 halaman × 10) | implemented | Pakai mention `<@id>` agar tidak perlu fetch member satu-satu |
| Role Reward (`/level-role tambah/hapus/list`, auto-assign saat naik level) | implemented | Role bersifat kumulatif (semua reward level ≤ level baru yang belum dimiliki akan diberikan) |
| Prestige (`/prestige`, minimal Level 50, reset level+XP, badge/achievement tetap) | implemented | Pakai confirm dialog sebelum reset (aksi destruktif) |
| Pengumuman naik level | implemented | Ke `GuildConfig.leveling.announceChannelId` jika diset dan `leveling.enabled` |
| Voice anti-abuse (anti-AFK-farm) | simplified | Hanya mengecualikan channel AFK guild; tidak ada deteksi solo-channel/deafen — bisa ditambah di stage Security jika diperlukan |

## Belum dikerjakan (menunggu checkpoint tahap berikutnya)

Setiap modul berikut butuh command + business logic + (untuk beberapa) rendering
canvas/PDF. Skema database untuk semua ini sudah ada di `src/database/models/`.

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
