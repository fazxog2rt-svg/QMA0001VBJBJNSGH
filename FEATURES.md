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

## Komunitas — Stage 11 (selesai)

| Feature | Status | Catatan |
|---|---|---|
| `/daily` — reward harian + streak (bonus 5 koin/hari streak, maks +150) | implemented | Cooldown 20 jam, streak reset jika tidak klaim dalam 48 jam (`dailyService.ts`) |
| `/reputasi` — beri reputasi ke member lain | implemented | Cooldown 24 jam per pemberi, tidak bisa ke diri sendiri/bot |
| `/poll` — polling reaksi (maks 10 opsi) | implemented | Emoji angka 1️⃣-🔟 |
| `/suggest` — kirim saran + approve/deny admin via button | implemented | Reaksi 👍👎 + tombol untuk moderator |
| Starboard (`/starboard aktifkan/nonaktifkan`) | implemented | `starboardService.ts`, update/hapus post otomatis mengikuti jumlah reaksi |
| `/birthday set/lihat/atur-channel` + pengumuman otomatis | implemented | Cron harian jam 08:00 WIB (`cronJobs.ts`) |
| `/remind` — pengingat dengan parser durasi (`10m`, `2h`, `1d2h30m`) | implemented | Diverifikasi lewat unit-level smoke test; cron cek setiap menit |
| `/afk` — status AFK + auto-clear saat kirim pesan + notifikasi saat di-mention | implemented | Disimpan di `Member` (persisten, bukan in-memory) |
| `/confess` — confession anonim bernomor urut + `/confess atur-channel` | implemented | `authorId` disimpan hanya untuk penanganan penyalahgunaan, tidak pernah ditampilkan publik |
| `/anon` — pesan anonim ke channel pilihan pengirim | implemented | Memvalidasi pengirim benar-benar punya izin Send Messages di channel tujuan sebelum mengirim |
| Temporary Voice Channel (`/tempvoice setup/kunci/buka/limit`) | implemented | Auto-create saat join hub, auto-delete saat kosong (`tempVoiceService.ts`) |
| Welcome Card & Goodbye Card (canvas) | implemented | `welcomeCardRenderer.ts` — diverifikasi visual untuk kedua varian |
| Auto Role (`/autorole tambah/hapus/list`) | implemented | Diterapkan otomatis di `guildMemberAdd` |
| Reaction Role (`/reactionrole tambah/hapus/list`) | implemented | Mendukung emoji unicode & custom emoji server |
| Voice Activity Tracker | implemented (Stage 10) | `Member.voiceMinutes`, sudah dipakai di profil, rank card, dan achievement |

## Tiket — Stage 12 (selesai)

| Feature | Status | Catatan |
|---|---|---|
| Multi Category (`/ticket-config tipe tambah/hapus/list`) | implemented | Default 3 tipe (Umum, Laporan, Teknis), bisa ditambah admin |
| Panel tiket (`/ticket-panel`, select menu tipe tiket) | implemented | Membuat channel privat dengan permission overwrite otomatis |
| Claim Ticket | implemented | Hanya role support/Manage Server yang bisa klaim |
| Close Ticket | implemented | **Mengunci** channel (bukan menghapus) — opener kehilangan Send Messages, transkrip dibuat, DM rating dikirim |
| Reopen Ticket | implemented | Staff bisa buka kembali izin kirim pesan tanpa membuat channel baru |
| Hapus channel tiket | implemented | Tombol terpisah dari "Tutup", staff-only, pakai confirm dialog |
| Ticket Rating | implemented | DM select menu 1-5 bintang ke pembuka tiket setelah ditutup |
| Transcript HTML | implemented | Escaped dari XSS (diverifikasi lewat smoke test), dikirim ke log channel |
| Transcript PDF | implemented | `pdfkit`, dikirim bersamaan dengan HTML |
| Ticket Logs | implemented | Ke `GuildConfig.tickets.logChannelId` jika diset |
| Nomor tiket unik otomatis | implemented | Counter atomik per-guild (`ticket:<guildId>`) |

## Moderasi — Stage 13 (selesai)

| Feature | Status | Catatan |
|---|---|---|
| `/warn` | implemented | DM notifikasi best-effort + case tercatat |
| `/mute` / `/unmute` | implemented | Role "Muted" auto-provisioned dengan overwrite di semua channel teks/voice |
| `/timeout` / `/untimeout` | implemented | Fitur bawaan Discord (maks 28 hari) |
| `/kick` | implemented | Mengecek `member.kickable` sebelum eksekusi |
| `/ban` (dengan opsi hapus pesan N hari) | implemented | Mengecek `member.bannable` |
| `/tempban` | implemented | Auto-unban via cron setiap menit (`cronJobs.ts`) saat `expiresAt` terlewati |
| `/softban` | implemented | Ban + unban langsung untuk membersihkan riwayat pesan |
| `/unban` | implemented | Validasi target benar-benar sedang dibanned |
| `/purge` (opsional filter per-user) | implemented | Bulk delete maks 100 pesan |
| `/lockdown` / `/unlock` | implemented | Toggle permission SendMessages untuk @everyone |
| `/slowmode` | implemented | 0-21600 detik |
| Nickname Filter (`/nickname-filter tambah/hapus/list`) | implemented | Auto-reset nickname di `guildMemberUpdate` jika mengandung kata terlarang |
| `/case lihat/riwayat` | implemented | Lookup per nomor kasus atau riwayat lengkap per member (paginated) |
| Perlindungan target | implemented | Tidak bisa moderasi diri sendiri, owner server, atau bot itu sendiri (`isModerationTargetSafe`) |
| Nomor kasus atomik | implemented | Counter per-guild, konsisten dengan pola KTP/tiket |

## Keamanan — Stage 14 (selesai)

| Feature | Status | Catatan |
|---|---|---|
| Anti Spam | implemented | Sliding window per-user (>5 pesan/7 detik), pesan dihapus + case warn otomatis |
| Anti Scam Link | implemented | Kombinasi keyword scam umum + TLD mencurigakan (`.xyz`, `.top`, dll) — diverifikasi tidak false-positive pada link normal (GitHub, dll) |
| Anti Invite | implemented | Regex `discord.gg/` dan `discord.com/invite/` |
| Anti Mention Spam | implemented | Ambang batas mention unik per pesan, dapat dikonfigurasi |
| Anti Raid | implemented | Deteksi lonjakan join (sliding window), menaikkan verification level server ke High selama 10 menit lalu otomatis kembali normal |
| Anti Nuke | implemented | Melacak aksi destruktif (hapus channel/role) via audit log per-eksekutor; jika melewati ambang batas, semua role eksekutor (bukan owner) dicabut sementara + alert admin — bukan ban otomatis, supaya aman dari false-positive |
| Verification / Captcha | implemented | Captcha matematika sederhana via DM + 3 tombol pilihan saat member join (jika diaktifkan) |
| Alt Detection | implemented | Menandai akun yang lebih baru dari ambang batas umur akun (jam), tercatat di `VerificationAttempt` |
| VPN Detection | **tidak dapat diimplementasikan** | Discord API tidak pernah memberi bot akses ke alamat IP user — deteksi VPN/IP sungguhan hanya mungkin lewat OAuth2 di web server yang menangkap IP, yang bertentangan dengan instruksi "tanpa website". Ini keterbatasan teknis nyata, bukan disederhanakan begitu saja. |
| Audit Log (`/auditlog [tipe]`) | implemented | Viewer paginated untuk `ActivityLog`, bisa difilter per tipe |
| Backup Role (`/role-backup buat/list`) | implemented | Snapshot nama/warna/permission/posisi semua role |
| Restore Role (`/role-backup pulihkan`) | implemented | Membuat ulang role yang hilang dari backup (confirm dialog, tidak menimpa role yang masih ada) |
| `/security-config` | implemented | Satu command admin untuk semua toggle automod/raid/nuke/verifikasi |

## AI (OpenRouter) — Stage 15 (selesai)

| Feature | Status | Catatan |
|---|---|---|
| Fondasi: 1 client OpenRouter (kompatibel OpenAI SDK), 1 model dikonfigurasi via `.env` | implemented | `openRouterClient.ts` — gagal secara graceful (pesan error jelas, bukan crash) jika `OPENROUTER_API_KEY` belum diatur; diverifikasi lewat smoke test |
| `/ai-chat` | implemented | |
| `/ai-translate` | implemented | |
| `/ai-summarize [jumlah]` | implemented | Meringkas N pesan terakhir channel |
| `/ai-code tanya/jelaskan` (Coding Assistant) | implemented | Juga tersedia sebagai context menu message **"Jelaskan Kode Ini"** |
| `/ai-moderate` | implemented | **Hanya rekomendasi untuk moderator** — AI tidak pernah mengambil tindakan (ban/mute) sendiri, mengurangi risiko false-positive dari LLM |
| `/ai-faq` + `/faq tambah/hapus/list` | implemented | Jawaban AI menggunakan FAQ server sebagai konteks bila relevan |
| `/ai-prompt` (Prompt Generator) | implemented | |
| `/ai-grammar` (Grammar Checker) | implemented | |
| `/ai-toggle` (admin) | implemented | Fitur AI mati secara default per-guild; admin harus mengaktifkan eksplisit |
| Pencatatan penggunaan | implemented | `Member.aiUsageCount` (dipakai achievement "AI Explorer") + `AiChatLog` per pemakaian |
| **Perbaikan fondasi**: Context Menu Command loader | implemented | Ternyata sejak Stage 4-7 belum ada loader untuk context menu command meski `client.contextMenuCommands` & `interactionCreate.ts` sudah menanganinya — ditambahkan `src/handlers/contextMenuHandler.ts` + folder `src/context-menus/`, dan `deployCommands.ts` diperbarui untuk mendaftarkan keduanya sekaligus |

## Ekonomi — Stage 16 (selesai)

| Feature | Status | Catatan |
|---|---|---|
| `/balance` (wallet + bank + total) | implemented | |
| `/weekly` | implemented | Cooldown 7 hari |
| `/work` | implemented | Cooldown 1 jam, penghasilan acak 50-250 |
| `/transfer` | implemented | Debit atomik via `findOneAndUpdate` bersyarat `walletBalance >= amount` — aman dari race/double-spend |
| `/bank setor/tarik` | implemented | |
| `/shop` + `/buy` + `/inventory` | implemented | Item bisa memberi role otomatis saat dibeli; stok terbatas/tak-terbatas |
| `/shop-admin tambah/hapus/mata-uang` | implemented | Admin kelola item & simbol mata uang |
| `/rich` (leaderboard terkaya) | implemented | Aggregation `wallet+bank`, di-sort di DB |
| `/daily` | implemented (Stage 11) | Sudah ada sejak modul Komunitas |

## Utilitas — Stage 16 (selesai)

| Feature | Status | Catatan |
|---|---|---|
| `/qr` | implemented | Render PNG via `qrcode` |
| `/password` | implemented | Pakai `crypto.randomInt` (bukan `Math.random`), balasan ephemeral |
| `/uuid` | implemented | `crypto.randomUUID`, hingga 10 sekaligus |
| `/timestamp` | implemented | Semua format Discord timestamp + offset opsional |
| `/calc` | implemented | Evaluator shunting-yard **aman** (bukan `eval`/`Function`) — diverifikasi lewat unit test bahwa input seperti `process.exit(1)` ditolak, bukan dieksekusi |
| `/json-format` | implemented | Validasi + pretty-print, ephemeral |
| `/color` | implemented | Swatch canvas + nilai RGB |
| `/embed-builder` | implemented | Modal → embed custom (admin) |
| `/announce` | implemented | Pengumuman ber-embed, mention @everyone dicek izin `MentionEveryone` dulu |

## Hiburan — Stage 16 (selesai)

| Feature | Status | Catatan |
|---|---|---|
| `/coinflip`, `/dice`, `/8ball` | implemented | |
| `/tod` (Truth / Dare / Would You Rather) | implemented | Konten lokal Bahasa Indonesia |
| `/meme` | implemented | Fetch dari meme-api.com, filter NSFW, fallback error graceful |
| `/trivia` | implemented | Open Trivia DB, tombol pilihan ganda + timer 20 detik |
| `/daily-quest` | implemented | Quest harian deterministik (sama untuk semua member per hari) |
| Pet Collection / Fishing | planned | `Pet` & `TransactionType.FISHING/MINING` ada di skema; gameplay loop belum dibuat — kandidat plugin/iterasi lanjutan |

## Event System — Stage 17 (selesai)

| Feature | Status | Catatan |
|---|---|---|
| `/event buat` (admin, Manage Events) | implemented | Embed event + tombol RSVP |
| RSVP (Hadir / Mungkin / Tidak) | implemented | Tombol, hitungan realtime di-update di embed |
| Countdown | implemented | Discord relative timestamp `<t:...:R>` |
| Reminder | implemented | Cron per-menit meng-ping peserta "Hadir" ~1 jam sebelum mulai (`reminded` flag mencegah spam) |
| Attendance | implemented | Saat `/event selesai`, peserta RSVP "going" dicatat ke `attendanceUserIds` |
| Event Badge | implemented | Badge (opsional) otomatis dibagikan ke semua peserta yang hadir |
| Lucky Draw | implemented | `/event selesai` mengundi 1 pemenang acak dari peserta hadir |
| `/event list` | implemented | Event mendatang, paginated-ready |
| Giveaway Integration (`/giveaway mulai/akhiri`) | implemented | Tombol ikut (toggle join/leave), auto-end via cron per-menit, undian pemenang acak tanpa duplikat |

## Testing, Optimasi & Dokumentasi — Stage 18-20 (selesai)

| Item | Status | Catatan |
|---|---|---|
| Unit test logika murni (Vitest) | implemented | 33 test di 6 file: kurva XP/leveling + `totalXpForLevel`, parser durasi, validasi KTP (NIK/tanggal/kode pos), detektor auto-moderasi, formatter durasi, dan kalkulator aman |
| Test keamanan kalkulator | implemented | Memverifikasi input berbahaya (`process.exit(1)`, `alert('x')`) **dilempar sebagai error**, bukan dieksekusi |
| Redis cache read-through | implemented | `src/services/cache.service.ts` — leaderboard XP & ekonomi di-cache 60 detik; fallback aman ke DB jika Redis mati (tidak pernah throw) |
| Rate limiter AI | implemented | `bottleneck` di `openRouterClient.ts` — maks 1 request/detik, melindungi kuota & rate limit OpenRouter |
| Atomic operations | implemented | Counter penomoran (KTP/tiket/kasus) + transfer ekonomi dengan update bersyarat (anti double-spend) |
| Error handling terpusat | implemented | `interactionCreate.ts` menangkap semua error interaksi, membalas ephemeral, dan mencatat via winston |
| Environment validation | implemented | `zod` di `src/config/env.ts` — bot menolak start jika variabel wajib hilang |
| Dokumentasi | implemented | `README.md` (daftar 83 command per kategori, performa, testing, deploy) + `FEATURES.md` (status jujur per stage) |

## Ringkasan akhir

- **83 slash command + 1 context menu**, 13 kategori
- **17 model MongoDB**, semua fitur menulis data nyata
- **12 event listener**, **4 cron job**, rendering canvas (KTP/profil/rank/welcome) + PDF (KTP/transkrip)
- **33 unit test** hijau, lint & typecheck bersih
- Semua tahap 1-20 dari spesifikasi selesai; item yang tidak mungkin secara teknis
  (VPN detection) atau di luar cakupan inti (pet/fishing gameplay) didokumentasikan
  jujur, bukan dipalsukan.
