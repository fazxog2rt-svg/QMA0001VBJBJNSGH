/**
 * Centralized access to public runtime env vars. Keeping these in one place
 * avoids scattering `process.env.NEXT_PUBLIC_*` (and its typos) everywhere.
 */
export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000",
  discordInviteUrl:
    process.env.NEXT_PUBLIC_DISCORD_INVITE_URL ??
    "https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot%20applications.commands&permissions=8",
} as const;

export const API_V1 = `${env.apiUrl}/api/v1`;
