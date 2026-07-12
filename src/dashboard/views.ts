/** Template HTML dashboard (server-rendered, tanpa framework). */

function esc(text: string): string {
  return text
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
    padding: 16px 24px; border-bottom: 1px solid #1c2130; background: #10141d; position: sticky; top: 0; }
  header .brand { font-weight: 700; font-size: 18px; }
  .wrap { max-width: 860px; margin: 0 auto; padding: 24px; }
  .card { background: #141926; border: 1px solid #222a3d; border-radius: 14px; padding: 20px; margin-bottom: 16px; }
  .btn { display: inline-block; background: #5865f2; color: #fff; padding: 10px 18px;
    border-radius: 10px; border: 0; font-size: 15px; cursor: pointer; font-weight: 600; }
  .btn.secondary { background: #232a3b; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; }
  .server { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 12px;
    background: #10141d; border: 1px solid #222a3d; }
  .server img, .avatar { width: 40px; height: 40px; border-radius: 50%; background: #2a3350; }
  .muted { color: #8b93a7; font-size: 13px; }
  h1 { font-size: 22px; } h2 { font-size: 16px; margin: 0 0 12px; color: #b9c2d9; }
  .row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0;
    border-bottom: 1px solid #1b2233; }
  .row:last-child { border-bottom: 0; }
  .switch { position: relative; width: 46px; height: 26px; }
  .switch input { display: none; }
  .slider { position: absolute; inset: 0; background: #333c52; border-radius: 26px; transition: .2s; }
  .slider::before { content: ""; position: absolute; width: 20px; height: 20px; left: 3px; top: 3px;
    background: #fff; border-radius: 50%; transition: .2s; }
  input:checked + .slider { background: #57f287; }
  input:checked + .slider::before { transform: translateX(20px); }
  .toast { background: #10331d; border: 1px solid #1f7a44; color: #9df5be; padding: 10px 14px;
    border-radius: 10px; margin-bottom: 16px; }
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
      return `<div class="server">${icon}<div style="flex:1">
        <div>${esc(g.name)}</div></div>${action}</div>`;
    })
    .join("");

  return layout(
    "Server — Panel Kontrol Bot",
    `<div class="wrap">
      <h1>Server yang kamu kelola</h1>
      <p class="muted">Hanya server tempat kamu punya izin <b>Manage Server</b> yang tampil.</p>
      <div class="grid" style="margin-top:16px">${cards || '<p class="muted">Tidak ada server.</p>'}</div>
    </div>`,
    { user },
  );
}

export interface ToggleItem {
  name: string;
  label: string;
  desc?: string;
  checked: boolean;
}
export interface ToggleGroup {
  title: string;
  items: ToggleItem[];
}

function toggleRow(item: ToggleItem): string {
  return `<div class="row"><div><div>${esc(item.label)}</div>${
    item.desc ? `<div class="muted">${esc(item.desc)}</div>` : ""
  }</div>
    <label class="switch"><input type="checkbox" name="${esc(item.name)}" ${
      item.checked ? "checked" : ""
    }><span class="slider"></span></label></div>`;
}

export function settingsPage(
  user: string,
  guild: { id: string; name: string; iconUrl: string | null },
  groups: ToggleGroup[],
  saved: boolean,
): string {
  const groupsHtml = groups
    .map(
      (group) =>
        `<div class="card"><h2>${esc(group.title)}</h2>${group.items
          .map(toggleRow)
          .join("")}</div>`,
    )
    .join("");

  const icon = guild.iconUrl ? `<img class="avatar" src="${esc(guild.iconUrl)}" alt="">` : "";

  return layout(
    `${guild.name} — Panel Kontrol Bot`,
    `<div class="wrap">
      <p><a href="/servers">← Semua server</a></p>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">${icon}<h1 style="margin:0">${esc(guild.name)}</h1></div>
      ${saved ? '<div class="toast">✅ Pengaturan disimpan. Perubahan berlaku dalam beberapa detik.</div>' : ""}
      <form method="post" action="/server/${guild.id}">
        ${groupsHtml}
        <button class="btn" type="submit">💾 Simpan Perubahan</button>
      </form>
    </div>`,
    { user },
  );
}

export function errorPage(message: string): string {
  return layout(
    "Error",
    `<div class="wrap"><div class="card"><h1>Ups</h1><p class="muted">${esc(message)}</p>
    <p><a class="btn secondary" href="/servers">Kembali</a></p></div></div>`,
  );
}
