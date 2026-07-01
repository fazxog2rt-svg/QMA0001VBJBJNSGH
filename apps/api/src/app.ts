import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import { corsOrigins } from "./config/env";
import { logger } from "./lib/logger";
import { swaggerSpec } from "./docs/swagger";
import { generalRateLimiter } from "./middleware/rateLimit";
import { maintenanceModeGate } from "./middleware/maintenanceMode";
import { csrfHeaderGuard } from "./middleware/auth";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

import authRouter from "./modules/auth/router";
import usersRouter from "./modules/users/router";
import guildsRouter from "./modules/guilds/router";
import moderationRouter from "./modules/moderation/router";
import economyRouter from "./modules/economy/router";
import levelingRouter from "./modules/leveling/router";
import ticketsRouter from "./modules/tickets/router";
import identityCardsRouter from "./modules/identity-cards/router";
import analyticsRouter from "./modules/analytics/router";
import premiumRouter from "./modules/premium/router";
import webhooksRouter from "./modules/webhooks/router";
import adminRouter, { guildBackupRouter } from "./modules/admin/router";
import publicRouter from "./modules/public/router";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === "/health",
      },
    }),
  );

  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/docs.json", (req, res) => {
    res.json(swaggerSpec);
  });

  // Global rate limit + maintenance-mode gate apply to all API traffic.
  app.use("/api/v1", generalRateLimiter);
  app.use("/api/v1", maintenanceModeGate);
  // CSRF: state-changing cookie-authenticated requests must carry
  // X-Requested-With (see middleware/auth.ts for rationale).
  app.use("/api/v1", csrfHeaderGuard);

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/users", usersRouter);
  app.use("/api/v1/guilds", guildsRouter);
  app.use("/api/v1/guilds", moderationRouter);
  app.use("/api/v1/guilds", economyRouter);
  app.use("/api/v1/guilds", levelingRouter);
  app.use("/api/v1/guilds", ticketsRouter);
  app.use("/api/v1", identityCardsRouter);
  app.use("/api/v1/guilds", analyticsRouter);
  app.use("/api/v1/premium", premiumRouter);
  app.use("/api/v1/webhooks", webhooksRouter);
  app.use("/api/v1/admin", adminRouter);
  app.use("/api/v1/guilds", guildBackupRouter);
  app.use("/api/v1/public", publicRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
