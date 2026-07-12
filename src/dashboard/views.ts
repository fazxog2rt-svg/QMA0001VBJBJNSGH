/** Template HTML dashboard (server-rendered, tanpa framework). */

export function esc(text: string): string {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const STYLE = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: #0b0d12; color: #e6e8ee; }
  a { color: #8ea2ff; text-decoration: none; }
  header { display: flex; align-items: center; justify-content: space-between;
    padding: 16px 24px; border-bottom: 1px solid #1c2130; background: #10141d; position: sticky; top: 0; z-index: 5; }
  header .brand { font-weight: 700; font-size: 18px; }
  .wrap { max-width: 880px; margin: 0 auto; padding: 24px; }
  .card { background: #141926; border: 1px solid #222a3d; border-radius: 14px; padding: 20px; margin-bottom: 16px; }
  .btn { display: inline-block; background: #5865f2; color: #fff; padding: 10px 18px;
    border-radius: 10px; border: 0; font-size: 15px; cursor: pointer; font-weight: 600; }
  .btn.secondary { background: #232a3b; } .btn.danger { background: #b53243; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; }
  .stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px,1fr)); gap: 12px; }
  .stat { background: #10141d; border: 1px solid #222a3d; border-radius: 12px; padding: 14px; }
  .stat .n { font-size: 24px; font-weight: 700; } .stat .l { color: #8b93a7; font-size: 13px; }
  .server { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 12px;
    background: #10141d; border: 1px solid #222a3d; }
  .server img, .avatar { width: 40px; height: 40px; border-radius: 50%; background: #2a3350; }
  .muted { color: #8b93a7; font-size: 13px; }
  h1 { font-size: 22px; } h2 { font-size: 16px; margin: 0 0 12px; color: #b9c2d9; }
  label.f { display: block; margin-bottom: 14px; } label.f .cap { display:block; margin-bottom:6px; color:#b9c2d9; font-size:14px; }
  input[type=text], input[type=number], textarea, select { width: 100%; padding: 10px 12px;
    background: #0d1119; border: 1px solid #2a3350; border-radius: 10px; color: #e6e8ee; font-size: 14px; }
  textarea { min-height: 70px; resize: vertical; }
  .row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #1b2233; }
  .row:last-child { border-bottom: 0; }
  .switch { position: relative; width: 46px; height: 26px; flex: 0 0 auto; }
  .switch input { display: none; }
  .slider { position: absolute; inset: 0; background: #333c52; border-radius: 26px; transition: .2s; }
  .slider::before { content: ""; position: absolute; width: 20px; height: 20px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: .2s; }
  input:checked + .slider { background: #57f287; }
  input:checked + .slider::before { transform: translateX(20px); }
  .toast { background: #10331d; border: 1px solid #1f7a44; color: #9df5be; padding: 10px 14px; border-radius: 10px; margin-bottom: 16px; }
  nav.tabs { display: flex; gap: 6px; flex-wrap: wrap; margin: 12px 0 18px; }
  nav.tabs a { padding: 8px 14px; border-radius: 999px; background: #141926; border: 1px solid #222a3d; color: #b9c2d9; }
  nav.tabs a.active { background: #5865f2; color: #fff; border-color: #5865f2; }
`;

export function layout(title: string, body: string, opts: { user?: string } = {}): string {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title><style>${STYLE}</style></head><body>
  <header><div class="brand">🛠️ Panel Kontrol Bot</div>
    <div>${opts.user ? `<span class="muted">${esc(opts.user)}</span> · <a href="/logout">Keluar</a>` : ""}</div>
  </header>${body}</body></html>`;
}

export function loginPage(): string {
  return layout(
    "Masuk — Panel Kontrol Bot",
    `<div class="wrap"><div class="card" style="text-align:center">
      <h1>Panel Kontrol Bot Komunitas</h1>
      <p class="muted">Masuk dengan Discord untuk mengatur fitur di server yang kamu kelola.</p>
      <p style="margin-top:20px"><a class="btn" href="/login">🔐 Masuk dengan Discord</a></p>
    </div></div>`,
  );
}

export function errorPage(message: string): string {
  return layout(
    "Error",
    `<div class="wrap"><div class="card"><h1>Ups</h1><p class="muted">${esc(message)}</p>
    <p><a class="btn secondary" href="/servers">Kembali</a></p></div></div>`,
  );
}

export interface GuildCardData {
  id: string;
  name: string;
  iconUrl: string | null;
  botPresent: boolean;
}

export function serversPage(user: string, guilds: GuildCardData[]): string {
  const cards = guilds
    .map((g) => {
      const icon = g.iconUrl
        ? `<img src="${esc(g.iconUrl)}" alt="">`
        : `<div class="avatar"></div>`;
      const action = g.botPresent
        ? `<a class="btn" href="/server/${g.id}">Atur</a>`
        : `<span class="muted">Bot belum masuk</span>`;
      return `<div class="server">${icon}<div style="flex:1"><div>${esc(g.name)}</div></div>${action}</div>`;
    })
    .join("");
  return layout(
    "Server — Panel Kontrol Bot",
    `<div class="wrap"><h1>Server yang kamu kelola</h1>
      <p class="muted">Hanya server tempat kamu punya izin <b>Manage Server</b> yang tampil.</p>
      <div class="grid" style="margin-top:16px">${cards || '<p class="muted">Tidak ada server.</p>'}</div>
    </div>`,
    { user },
  );
}

// ---- Field & layout helpers (dipakai server.ts untuk menyusun body) ----

export function card(title: string, inner: string): string {
  return `<div class="card"><h2>${esc(title)}</h2>${inner}</div>`;
}

export function textField(name: string, label: string, value: string): string {
  return `<label class="f"><span class="cap">${esc(label)}</span>
    <input type="text" name="${esc(name)}" value="${esc(value)}"></label>`;
}

export function numberField(name: string, label: string, value: number): string {
  return `<label class="f"><span class="cap">${esc(label)}</span>
    <input type="number" name="${esc(name)}" value="${esc(String(value))}"></label>`;
}

export function textareaField(name: string, label: string, value: string): string {
  return `<label class="f"><span class="cap">${esc(label)}</span>
    <textarea name="${esc(name)}">${esc(value)}</textarea></label>`;
}

export function selectField(
  name: string,
  label: string,
  options: { value: string; label: string }[],
  selected: string,
): string {
  const opts = options
    .map(
      (o) =>
        `<option value="${esc(o.value)}" ${o.value === selected ? "selected" : ""}>${esc(o.label)}</option>`,
    )
    .join("");
  return `<label class="f"><span class="cap">${esc(label)}</span>
    <select name="${esc(name)}">${opts}</select></label>`;
}

export interface ToggleItem {
  name: string;
  label: string;
  desc?: string;
  checked: boolean;
}

export function toggleRow(item: ToggleItem): string {
  return `<div class="row"><div><div>${esc(item.label)}</div>${
    item.desc ? `<div class="muted">${esc(item.desc)}</div>` : ""
  }</div><label class="switch"><input type="checkbox" name="${esc(item.name)}" ${
    item.checked ? "checked" : ""
  }><span class="slider"></span></label></div>`;
}

const TABS: { key: string; label: string; path: string }[] = [
  { key: "fitur", label: "Fitur", path: "" },
  { key: "stats", label: "📊 Statistik", path: "/stats" },
  { key: "channels", label: "⚙️ Channel & Teks", path: "/channels" },
  { key: "economy", label: "💰 Ekonomi & Level", path: "/economy" },
  { key: "games", label: "🎮 Faksi & Musim", path: "/games" },
];

function serverNav(id: string, active: string): string {
  return `<nav class="tabs">${TABS.map(
    (t) =>
      `<a class="${t.key === active ? "active" : ""}" href="/server/${id}${t.path}">${t.label}</a>`,
  ).join("")}</nav>`;
}

export interface GuildHeader {
  id: string;
  name: string;
  iconUrl: string | null;
}

/** Kerangka halaman per-server: header guild + tab nav + body. */
export function serverShell(
  user: string,
  guild: GuildHeader,
  active: string,
  body: string,
  saved: boolean,
): string {
  const icon = guild.iconUrl ? `<img class="avatar" src="${esc(guild.iconUrl)}" alt="">` : "";
  return layout(
    `${guild.name} — Panel Kontrol Bot`,
    `<div class="wrap">
      <p><a href="/servers">← Semua server</a></p>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px">${icon}<h1 style="margin:0">${esc(guild.name)}</h1></div>
      ${serverNav(guild.id, active)}
      ${saved ? '<div class="toast">✅ Tersimpan. Perubahan berlaku dalam beberapa detik.</div>' : ""}
      ${body}
    </div>`,
    { user },
  );
}
