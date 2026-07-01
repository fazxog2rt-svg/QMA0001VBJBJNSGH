import { MessageFlags, type ButtonInteraction } from "discord.js";
import { prisma } from "@nexusbot/database";

/** Handles button interactions with customId "giveaway:enter:<giveawayId>". */
export async function handleGiveawayButton(interaction: ButtonInteraction): Promise<void> {
  const [, action, giveawayId] = interaction.customId.split(":");
  if (action !== "enter" || !giveawayId) return;

  const giveaway = await prisma.giveaway.findUnique({ where: { id: giveawayId } });
  if (!giveaway || giveaway.endedAt) {
    await interaction.reply({ content: "This giveaway has already ended.", flags: MessageFlags.Ephemeral });
    return;
  }

  const existing = await prisma.giveawayEntry.findUnique({
    where: { giveawayId_userId: { giveawayId, userId: interaction.user.id } },
  });

  if (existing) {
    await interaction.reply({ content: "You're already entered in this giveaway. Good luck!", flags: MessageFlags.Ephemeral });
    return;
  }

  await prisma.giveawayEntry.create({ data: { giveawayId, userId: interaction.user.id } });
  await interaction.reply({ content: `You're entered in the giveaway for **${giveaway.prize}**! Good luck!`, flags: MessageFlags.Ephemeral });
}
