import mongoose from "mongoose";
import { env } from "../config/env";
import { logger } from "../services/logger.service";

mongoose.set("strictQuery", true);

export async function connectDatabase(): Promise<typeof mongoose> {
  mongoose.connection.on("error", (error) => {
    logger.error("MongoDB connection error", { error: error.message });
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });

  await mongoose.connect(env.MONGODB_URI);
  logger.info("MongoDB connected", { uri: redactUri(env.MONGODB_URI) });
  return mongoose;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

function redactUri(uri: string): string {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@");
}
