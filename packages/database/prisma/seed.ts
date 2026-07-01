import { PrismaClient, PremiumTier, IdentityCardType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding NexusBot database...");

  const owner = await prisma.user.upsert({
    where: { email: "owner@nexusbot.dev" },
    update: {},
    create: {
      email: "owner@nexusbot.dev",
      username: "NexusOwner",
      displayName: "Nexus Owner",
      role: "OWNER",
      emailVerified: new Date(),
    },
  });

  const guild = await prisma.guild.upsert({
    where: { id: "000000000000000001" },
    update: {},
    create: {
      id: "000000000000000001",
      name: "NexusBot HQ",
      ownerId: owner.discordId ?? "000000000000000099",
      memberCount: 128,
      premiumTier: PremiumTier.ENTERPRISE,
      settings: {
        create: {
          welcomeMessage: "Welcome to NexusBot HQ, {user}!",
          goodbyeMessage: "{user} has left the server.",
        },
      },
    },
  });

  await prisma.guildStaff.upsert({
    where: { guildId_userId: { guildId: guild.id, userId: owner.id } },
    update: {},
    create: { guildId: guild.id, userId: owner.id, role: "OWNER" },
  });

  const member = await prisma.guildMember.upsert({
    where: { guildId_discordUserId: { guildId: guild.id, discordUserId: "000000000000000099" } },
    update: {},
    create: {
      guildId: guild.id,
      discordUserId: "000000000000000099",
      username: "NexusOwner#0001",
      xp: 4200,
      level: 12,
      economy: {
        create: { wallet: 5000, bank: 20000, bankCapacity: 50000 },
      },
    },
  });

  await prisma.identityCard.create({
    data: {
      guildId: guild.id,
      userId: owner.id,
      discordUserId: "000000000000000099",
      type: IdentityCardType.STAFF,
      fullName: "Nexus Owner",
      theme: "aurora",
      badges: ["founder", "verified"],
      level: 12,
      roleLabel: "Server Owner",
      isVerified: true,
    },
  });

  await prisma.announcement.create({
    data: {
      title: "Welcome to NexusBot",
      content: "NexusBot platform is now live. Explore the dashboard, invite the bot, and check out the new Identity Card system!",
      type: "changelog",
      version: "1.0.0",
    },
  });

  await prisma.featureFlag.upsert({
    where: { key: "ai_assistant" },
    update: {},
    create: { key: "ai_assistant", enabled: true, rolloutPercent: 100, description: "AI assistant suite" },
  });

  console.log({ owner: owner.id, guild: guild.id, member: member.id });
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
