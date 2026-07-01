import path from "node:path";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { env } from "../config/env";

const logsDir = path.join(__dirname, "..", "logs");

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "komunitas-bot" },
  transports: [
    new DailyRotateFile({
      dirname: logsDir,
      filename: "%DATE%-error.log",
      level: "error",
      datePattern: "YYYY-MM-DD",
      maxFiles: "14d",
    }),
    new DailyRotateFile({
      dirname: logsDir,
      filename: "%DATE%-combined.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "14d",
    }),
  ],
});

if (env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  );
}
