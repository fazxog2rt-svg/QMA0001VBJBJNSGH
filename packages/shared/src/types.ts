export type PlatformRole = "USER" | "MODERATOR" | "ADMIN" | "OWNER";

export interface JwtPayload {
  sub: string; // user id
  role: PlatformRole;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface BotStatsPayload {
  guildCount: number;
  userCount: number;
  ping: number;
  cpuPercent: number;
  ramUsedMb: number;
  ramTotalMb: number;
  uptimeSeconds: number;
  shardCount: number;
  commandsExecuted: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
