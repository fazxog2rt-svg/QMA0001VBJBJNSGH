-- CreateEnum
CREATE TYPE "BotInstanceStatus" AS ENUM ('OFFLINE', 'READY', 'STARTING', 'ONLINE', 'STOPPING', 'CRASHED');

-- CreateTable
CREATE TABLE "bot_instances" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "guildId" TEXT,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "BotInstanceStatus" NOT NULL DEFAULT 'OFFLINE',
    "pid" INTEGER,
    "lastExitCode" INTEGER,
    "lastConnectedAt" TIMESTAMP(3),
    "lastHeartbeatAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_instances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bot_instances_tokenHash_key" ON "bot_instances"("tokenHash");

-- CreateIndex
CREATE INDEX "bot_instances_ownerId_idx" ON "bot_instances"("ownerId");

-- AddForeignKey
ALTER TABLE "bot_instances" ADD CONSTRAINT "bot_instances_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_instances" ADD CONSTRAINT "bot_instances_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
