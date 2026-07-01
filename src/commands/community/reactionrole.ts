import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { ReactionRole } from "../../database/models/ReactionRole";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";

function extractEmojiKey(input: string): string {
  const customEmojiMatch = /^<a?:\w+:(\d+)>$/.exec(input.trim());
  return customEmojiMatch ? customEmojiMatch[1]! : input.trim();
}

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("reactionrole")
    .setDescription("[Admin] Kelola reaction role.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("tambah")
        .setDescription("Tambah reaction role pada pesan di channel ini.")
        .addStringOption((option) =>
          option.setName("message_id").setDescription("ID pesan target.").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("emoji").setDescription("Emoji pemicu.").setRequired(true),
        )
        .addRoleOption((option) =>
          option.setName("role").setDescription("Role yang diberikan.").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("hapus")
        .setDescription("Hapus reaction role dari pesan.")
        .addStringOption((option) =>
          option.setName("message_id").setDescription("ID pesan target.").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("emoji").setDescription("Emoji yang dihapus.").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription("Lihat semua reaction role pada pesan.")
        .addStringOption((option) =>
          option.setName("message_id").setDescription("ID pesan target.").setRequired(true),
        ),
    ),
  category: "community",
  requiredPermissions: [PermissionFlagsBits.ManageGuild],
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.channel?.isTextBased()) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const messageId = interaction.options.getString("message_id", true);

    const message = await interaction.channel.messages.fetch(messageId).catch(() => null);
    if (!message) {
      await interaction.reply({
        embeds: [
          errorEmbed(
            "Pesan tidak ditemukan di channel ini. Jalankan command di channel yang sama dengan pesannya.",
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === "tambah") {
      const emojiInput = interaction.options.getString("emoji", true);
      const role = interaction.options.getRole("role", true);
      const emojiKey = extractEmojiKey(emojiInput);

      await ReactionRole.findOneAndUpdate(
        { messageId, emoji: emojiKey },
        {
          guildId: interaction.guildId,
          messageId,
          channelId: message.channelId,
          emoji: emojiKey,
          roleId: role.id,
        },
        { upsert: true },
      );

      await message.react(emojiInput).catch(() => undefined);

      await interaction.reply({
        embeds: [
          successEmbed(`Bereaksi ${emojiInput} pada pesan akan memberikan role <@&${role.id}>.`),
        ],
      });
      return;
    }

    if (subcommand === "hapus") {
      const emojiInput = interaction.options.getString("emoji", true);
      const emojiKey = extractEmojiKey(emojiInput);

      const deleted = await ReactionRole.findOneAndDelete({ messageId, emoji: emojiKey });
      if (!deleted) {
        await interaction.reply({
          embeds: [errorEmbed("Reaction role tidak ditemukan.")],
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({ embeds: [successEmbed("Reaction role dihapus.")] });
      return;
    }

    const mappings = await ReactionRole.find({ messageId });
    if (mappings.length === 0) {
      await interaction.reply({
        embeds: [errorEmbed("Belum ada reaction role pada pesan ini.")],
        ephemeral: true,
      });
      return;
    }

    const lines = mappings.map((mapping) => `${mapping.emoji} → <@&${mapping.roleId}>`);
    await interaction.reply({
      embeds: [buildEmbed("primary").setTitle("🎭 Reaction Role").setDescription(lines.join("\n"))],
    });
  },
};

export default command;
