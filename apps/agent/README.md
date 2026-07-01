# @nexusbot/agent

A tiny daemon you run **next to your own Discord bot**, on your own server. It lets the
NexusBot dashboard start/stop/restart your bot and watch its logs live, without giving the
dashboard your server's credentials or opening any inbound ports — the agent connects
*out* to the NexusBot API over WebSocket, the same way a browser tab would.

It does **not** run your bot's code inside itself and it does **not** accept arbitrary
remote commands. It only ever runs the single shell command you configure locally in
`NEXUS_START_COMMAND`; the dashboard can only send it `start` / `stop` / `restart` signals.

## Setup

1. In the NexusBot dashboard, go to **Bot Console → New Instance** and create one. Copy the
   token shown (it's only shown once).
2. On the server where your bot already runs:
   ```bash
   git clone <this repo> nexusbot-agent   # or just copy apps/agent out on its own
   cd apps/agent
   npm install
   cp .env.example .env
   ```
3. Edit `.env`:
   - `NEXUS_API_URL` — your NexusBot API's base URL.
   - `NEXUS_AGENT_TOKEN` — the token from step 1.
   - `NEXUS_START_COMMAND` — however you normally start your bot, e.g. `npm start`,
     `node index.js`, `python bot.py`.
   - `NEXUS_WORKING_DIR` — the directory that command should run in (defaults to wherever
     you launch the agent from).
4. Run it:
   ```bash
   npm run build && npm start
   # or during development:
   npm run dev
   ```
5. Your bot won't start automatically — hit **Start** in the dashboard's Bot Console once
   the instance shows as connected. From then on you get Start/Stop/Restart and a live log
   stream in the dashboard.

## Running the agent itself as a service

The agent is just a long-running Node process — run it with PM2, systemd, or Docker like
any other daemon so it survives reboots and reconnects automatically after network blips
(it retries the WebSocket connection on its own).
