import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "@nexusbot/database";
import { ApiError } from "../../middleware/errorHandler";
import { writeAuditLog } from "../../middleware/auditLog";
import { generateAgentToken } from "../../lib/security";
import { getIO } from "../../lib/socket";
import { isAgentConnected, sendAgentCommand } from "../../lib/agentSocket";

export const createInstanceSchema = z.object({
  name: z.string().min(1).max(64),
  guildId: z.string().optional(),
});

const INSTANCE_LIST_SELECT = {
  id: true,
  name: true,
  guildId: true,
  status: true,
  pid: true,
  lastExitCode: true,
  lastConnectedAt: true,
  lastHeartbeatAt: true,
  createdAt: true,
} as const;

export async function listInstances(req: Request, res: Response) {
  const instances = await prisma.botInstance.findMany({
    where: { ownerId: req.user!.sub },
    orderBy: { createdAt: "desc" },
    select: INSTANCE_LIST_SELECT,
  });
  res.status(200).json({
    instances: instances.map((i) => ({ ...i, agentConnected: isAgentConnected(i.id) })),
  });
}

export async function createInstance(req: Request, res: Response) {
  const { name, guildId } = createInstanceSchema.parse(req.body);

  if (guildId) {
    const isStaff =
      req.user!.role === "ADMIN" ||
      req.user!.role === "OWNER" ||
      (await prisma.guildStaff.findUnique({ where: { guildId_userId: { guildId, userId: req.user!.sub } } }));
    if (!isStaff) throw ApiError.forbidden("You are not staff on this guild");
  }

  const { plaintext, hash } = generateAgentToken();

  const instance = await prisma.botInstance.create({
    data: { name, guildId, ownerId: req.user!.sub, tokenHash: hash },
  });

  await writeAuditLog({ guildId, actorId: req.user!.sub, action: "bot_instance.create", target: instance.id, req });

  // The plaintext agent token is only ever returned here, at creation time.
  res.status(201).json({ instance: { ...instance, tokenHash: undefined }, token: plaintext });
}

export async function regenerateToken(req: Request, res: Response) {
  const { id } = req.params;
  const instance = await prisma.botInstance.findUnique({ where: { id } });
  if (!instance || instance.ownerId !== req.user!.sub) throw ApiError.notFound("Bot instance not found");

  const { plaintext, hash } = generateAgentToken();
  await prisma.botInstance.update({ where: { id }, data: { tokenHash: hash } });

  await writeAuditLog({ actorId: req.user!.sub, action: "bot_instance.regenerate_token", target: id, req });

  res.status(200).json({ token: plaintext });
}

export async function deleteInstance(req: Request, res: Response) {
  const { id } = req.params;
  const instance = await prisma.botInstance.findUnique({ where: { id } });
  if (!instance || instance.ownerId !== req.user!.sub) throw ApiError.notFound("Bot instance not found");

  await prisma.botInstance.delete({ where: { id } });
  await writeAuditLog({ actorId: req.user!.sub, action: "bot_instance.delete", target: id, req });

  res.status(204).send();
}

async function assertOwnedInstance(req: Request) {
  const { id } = req.params;
  const instance = await prisma.botInstance.findUnique({ where: { id } });
  if (!instance || instance.ownerId !== req.user!.sub) throw ApiError.notFound("Bot instance not found");
  return instance;
}

export async function startInstance(req: Request, res: Response) {
  const instance = await assertOwnedInstance(req);
  const dispatched = sendAgentCommand(getIO(), instance.id, "start");
  if (!dispatched) throw new ApiError(409, "AGENT_OFFLINE", "Agent is not connected");
  await writeAuditLog({ actorId: req.user!.sub, action: "bot_instance.start", target: instance.id, req });
  res.status(202).json({ dispatched: true });
}

export async function stopInstance(req: Request, res: Response) {
  const instance = await assertOwnedInstance(req);
  const dispatched = sendAgentCommand(getIO(), instance.id, "stop");
  if (!dispatched) throw new ApiError(409, "AGENT_OFFLINE", "Agent is not connected");
  await writeAuditLog({ actorId: req.user!.sub, action: "bot_instance.stop", target: instance.id, req });
  res.status(202).json({ dispatched: true });
}

export async function restartInstance(req: Request, res: Response) {
  const instance = await assertOwnedInstance(req);
  const dispatched = sendAgentCommand(getIO(), instance.id, "restart");
  if (!dispatched) throw new ApiError(409, "AGENT_OFFLINE", "Agent is not connected");
  await writeAuditLog({ actorId: req.user!.sub, action: "bot_instance.restart", target: instance.id, req });
  res.status(202).json({ dispatched: true });
}
