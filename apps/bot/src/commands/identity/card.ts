import { SlashCommandBuilder, AttachmentBuilder, MessageFlags } from "discord.js";
import { prisma, IdentityCardType } from "@nexusbot/database";
import { IDENTITY_CARD_THEMES, identityCardCreateSchema } from "@nexusbot/shared";
import type { Command } from "../../types/command";
import { renderIdentityCard, CARD_THEMES } from "../../features/identityCard/renderer";

// Sourced from the shared zod schema (a plain string union) rather than the
// Prisma-generated enum directly, so the choice list has a stable type even
// before `prisma generate` has produced the client's enum export.
const CARD_TYPE_VALUES = identityCardCreateSchema.shape.type.options;
const TYPE_CHOICES: { name: string; value: string }[] = CARD_TYPE_VALUES.map((value) => ({ name: value, value }));

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("card")
    .setDescription("Generate your NexusBot identity card")
    .addStringOption((opt) =>
      opt.setName("type").setDescription("Card type").setRequired(true).addChoices(...TYPE_CHOICES.slice(0, 25)),
    )
    .addStringOption((opt) => opt.setName("full_name").setDescription("Name to display on the card").setRequired(true))
    .addStringOption((opt) =>
      opt
        .setName("theme")
        .setDescription("Visual theme")
        .setRequired(false)
        .addChoices(...IDENTITY_CARD_THEMES.map((t) => ({ name: t, value: t }))),
    )
    .addStringOption((opt) => opt.setName("role_label").setDescription("Role/title label shown under your name").setRequired(false)) as SlashCommandBuilder,
  cooldownSeconds: 10,

  async execute(interaction) {
    if (!interaction.guild) return;
    await interaction.deferReply();

    const type = interaction.options.getString("type", true) as IdentityCardType;
    const fullName = interaction.options.getString("full_name", true);
    const requestedTheme = interaction.options.getString("theme") ?? "default";
    const roleLabel = interaction.options.getString("role_label") ?? undefined;

    // Only themes actually implemented in the renderer's registry are drawable;
    // anything else in IDENTITY_CARD_THEMES falls back to "default" gracefully.
    const theme = CARD_THEMES[requestedTheme] ? requestedTheme : "default";

    const member = await prisma.guildMember.upsert({
      where: { guildId_discordUserId: { guildId: interaction.guild.id, discordUserId: interaction.user.id } },
      update: {},
      create: { guildId: interaction.guild.id, discordUserId: interaction.user.id, username: interaction.user.username, avatarUrl: interaction.user.displayAvatarURL() },
    });

    const dbUser = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });

    const card = await prisma.identityCard.create({
      data: {
        guildId: interaction.guild.id,
        userId: dbUser?.id ?? undefined,
        discordUserId: interaction.user.id,
        type,
        fullName,
        avatarUrl: interaction.user.displayAvatarURL(),
        theme,
        level: member.level,
        roleLabel,
        serverJoinDate: interaction.member && "joinedAt" in interaction.member ? (interaction.member.joinedAt as Date | null) : null,
      },
    });

    const shareUrl = `https://nexusbot.io/cards/${card.shareSlug}`;

    const buffer = await renderIdentityCard({
      theme,
      fullName,
      roleLabel,
      typeLabel: type,
      level: member.level,
      badges: card.badges,
      avatarUrl: interaction.user.displayAvatarURL({ extension: "png", size: 256 }),
      shareUrl,
      guildName: interaction.guild.name,
      isVerified: card.isVerified,
      uniqueCode: card.uniqueCode,
    });

    await prisma.identityCard.update({ where: { id: card.id }, data: { qrCodeUrl: shareUrl } });

    const attachment = new AttachmentBuilder(buffer, { name: "identity-card.png" });
    await interaction.editReply({
      content: `Your **${type}** identity card (theme: ${theme}). Share link: ${shareUrl}`,
      files: [attachment],
    });
  },
};

export default command;
