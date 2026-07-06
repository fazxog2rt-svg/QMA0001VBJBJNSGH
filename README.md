# Komunitas Bot

Discord Bot Community All-in-One untuk **server komunitas publik Indonesia** — identitas
digital (KTP), profil member premium, leveling, ekonomi, tiket, moderasi, keamanan, dan AI.
100% dikonfigurasi langsung dari Discord — tidak ada website atau dashboard.

## Tech stack

| Layer | Teknologi |
|---|---|
| Runtime | Node.js 20+, TypeScript |
| Discord | discord.js v14 (Slash Command, Button, Select Menu, Modal, Context Menu, Autocomplete) |
| Database | MongoDB + Mongoose |
| Cache / cooldown / rate limit | Redis (ioredis) |
| AI | OpenRouter (kompatibel OpenAI SDK) |
| Rendering | `@napi-rs/canvas` (kartu KTP/profil), `qrcode`, `pdfkit` |
| Ops | Docker, Docker Compose, PM2, GitHub Actions CI |
| Quality | ESLint, Prettier, Husky + lint-staged, Vitest |

## Struktur folder

```
src/
  commands/       Slash command, dikelompokkan per kategori (ktp, profile, leveling, ...)
  events/         Discord.js event listener (ready, interactionCreate, guildCreate, ...)
  components/     Handler untuk button / select menu / modal / context menu
  handlers/       Loader: command, event, component + skrip deploy-commands
  services/       Logger (winston), Redis, dan service lain (AI, dsb.)
  database/       Koneksi Mongoose + models/
  middlewares/    Cooldown & permission checking untuk command
  utils/          Embed builder, pagination, confirm dialog, i18n, file walker
  types/          Kontrak TypeScript (SlashCommand, BotEvent, komponen)
  config/         Environment (zod-validated) & konstanta (XP curve, badge, achievement)
  locales/        String terjemahan (default: id.json)
  logs/           Log file harian (winston-daily-rotate-file)
tests/            Unit test (Vitest)
```

## Arsitektur

- **Command handler** memindai `src/commands/**` secara rekursif, setiap file men-`export
  default` sebuah `SlashCommand` (lihat `src/types/command.ts`).
- **Event handler** memindai `src/events/**`, setiap file men-`export default` sebuah
  `BotEvent` yang dipetakan langsung ke event discord.js.
- **Component handler** memuat `src/components/{buttons,selects,modals}/**`; pencocokan
  `customId` mendukung prefix (`ticket:open` cocok dengan `ticket:open:123`) supaya satu
  handler bisa menangani banyak instance dinamis (lihat `interactionCreate.ts`).
- **Middlewares** (`cooldown`, `permission`) dijalankan terpusat di `interactionCreate`
  sebelum `command.execute` dipanggil — command tidak perlu mengimplementasikan cek ini
  sendiri.
- Semua interaksi Discord (embed premium, pagination, confirm dialog) memakai helper di
  `src/utils/` supaya UI konsisten di seluruh command.

## Menjalankan secara lokal

### 1. Install dependencies
```bash
npm install
```

### 2. Konfigurasi environment
```bash
cp .env.example .env
# isi DISCORD_TOKEN, DISCORD_CLIENT_ID, MONGODB_URI, REDIS_URL, OPENROUTER_API_KEY
```

### 3. Jalankan MongoDB + Redis
```bash
docker compose up -d mongo redis
```

### 4. Deploy slash command
```bash
npm run deploy-commands
```
Set `DISCORD_DEV_GUILD_ID` di `.env` untuk deploy instan ke satu guild saat development;
kosongkan untuk deploy global (butuh waktu hingga 1 jam untuk propagasi).

### 5. Jalankan bot (dev, dengan hot-reload)
```bash
npm run dev
```

## Menjalankan dengan Docker Compose (full stack)
```bash
cp .env.example .env
docker compose up --build
```

## Deploy production dengan PM2
```bash
npm run build
pm2 start ecosystem.config.js
```

## Scripts

| Command | Deskripsi |
|---|---|
| `npm run dev` | Jalankan bot dengan hot-reload (tsx watch) |
| `npm run build` | Compile TypeScript ke `dist/` |
| `npm start` | Jalankan hasil build (`dist/index.js`) |
| `npm run deploy-commands` | Registrasi slash command ke Discord API |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` | Prettier |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` / `test:watch` | Vitest |

## Daftar Command (100 slash + 1 context menu)

Semua konfigurasi dilakukan lewat command Discord — tidak ada web dashboard.

| Kategori | Command |
|---|---|
| 🪪 Identitas Digital (KTP) | `/ktp buat·lihat·riwayat·verifikasi·tolak` |
| 👤 Profil Member | `/profile lihat·edit·achievements`, `/badge beri·cabut` |
| 📈 Leveling | `/rank`, `/leaderboard`, `/level-role`, `/prestige`, `/xp beri` |
| 🎉 Komunitas | `/daily`, `/reputasi`, `/poll`, `/suggest`, `/starboard`, `/birthday`, `/remind`, `/afk`, `/confess`, `/anon`, `/tempvoice`, `/welcome`, `/autorole`, `/reactionrole`, `/counting`, `/sticky`, `/marriage lamar·cerai·status`, `/pet adopsi·status·kasih-makan·main·rename`, `/autoresponder tambah·hapus·list`, `/motivasi setup·nonaktif·kirim` |
| 🎫 Tiket | `/ticket-panel`, `/ticket-config` (+ tombol claim/close/reopen/delete & rating) |
| 🔨 Moderasi | `/warn`, `/mute`·`/unmute`, `/timeout`·`/untimeout`, `/kick`, `/ban`·`/unban`, `/tempban`, `/softban`, `/purge`, `/lockdown`·`/unlock`, `/slowmode`, `/nickname-filter`, `/case`, `/report lapor·channel`, `/sidang buat·list·batal·putusan` |
| 🛡️ Keamanan | `/security-config`, `/auditlog`, `/role-backup`, `/verification` (gerbang tombol) (+ automod, anti-raid, anti-nuke, captcha otomatis) |
| 🧰 Utilitas | `/qr`, `/password`, `/uuid`, `/timestamp`, `/calc`, `/json-format`, `/color`, `/embed-builder`, `/announce`, `/help`, `/ping` |
| 🤖 AI (OpenRouter) | `/ai-chat`, `/ai-translate`, `/ai-summarize`, `/ai-code`, `/ai-grammar`, `/ai-prompt`, `/ai-moderate`, `/ai-faq`, `/faq`, `/ai-toggle`, `/ai-channel` (auto-reply per channel: persona + model), context menu "Jelaskan Kode Ini" |
| 🎲 Hiburan | `/coinflip`, `/dice`, `/8ball`, `/tod`, `/meme`, `/trivia`, `/daily-quest`, `/tebak-angka`, `/suit` |
| 💰 Ekonomi | `/balance`, `/bank`, `/transfer`, `/weekly`, `/work`, `/shop`, `/buy`, `/inventory`, `/rich`, `/shop-admin`, `/job`, `/slot`, `/gamble`, `/rob`, `/blackjack` |
| 📅 Event | `/event buat·selesai·list`, `/giveaway mulai·akhiri` |

## Performa & Optimasi

- **Redis cache** (`src/services/cache.service.ts`): leaderboard XP & ekonomi di-cache 60 detik
  (read-through, fallback aman ke DB jika Redis mati).
- **Rate limiter** (`bottleneck`): panggilan AI OpenRouter dibatasi 1 request/detik untuk
  melindungi kuota & rate limit.
- **Cooldown** per-command per-user dicek terpusat di `interactionCreate`.
- **Cron scheduler** (`node-cron`): reminder, tempban expiry, giveaway auto-end, event
  reminder (per menit) + pengumuman ulang tahun (08:00 WIB).
- **Atomic counters** untuk penomoran KTP/tiket/kasus (aman dari race condition), dan
  transfer ekonomi memakai update bersyarat (aman dari double-spend).

## Testing

`npm test` menjalankan 33 unit test (Vitest) untuk logika murni: kurva XP/leveling,
parser durasi, validasi KTP, detektor auto-moderasi, dan kalkulator aman (termasuk test
yang memverifikasi input berbahaya seperti `process.exit(1)` **ditolak**, bukan dieksekusi).

## Status fitur

Lihat [`FEATURES.md`](FEATURES.md) untuk status jujur setiap fitur (implemented / partial /
planned) per tahap pengerjaan.

## Keamanan

- Environment divalidasi dengan `zod` saat startup (`src/config/env.ts`) — bot menolak
  berjalan jika variabel wajib hilang.
- Semua mutasi command melalui middleware permission (`requiredPermissions`/`ownerOnly`)
  sebelum eksekusi.
- Cooldown per-command per-user dicek terpusat di `interactionCreate`, mencegah command
  spam.
- Data confession disimpan dengan `authorId` tersembunyi dari publik — hanya digunakan
  untuk penanganan penyalahgunaan oleh moderator.
- `.env` tidak pernah di-commit (`.gitignore`); gunakan `.env.example` sebagai referensi.

## Lisensi
Proprietary — seluruh hak cipta dilindungi kecuali dinyatakan lain dalam file LICENSE.
