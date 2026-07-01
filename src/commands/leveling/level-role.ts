import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { GuildConfig } from "../../database/models/GuildConfig";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("level-role")
    .setDescription("[Admin] Kelola role reward level.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("tambah")
        .setDescription("Tambah role reward untuk level tertentu.")
        .addIntegerOption((option) =>
          option.setName("level").setDescription("Level target.").setRequired(true).setMinValue(1),
        )
        .addRoleOption((option) =>
          option.setName("role").setDescription("Role yang diberikan.").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("hapus")
        .setDescription("Hapus role reward pada level tertentu.")
        .addIntegerOption((option) =>
          option.setName("level").setDescription("Level target.").setRequired(true).setMinValue(1),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("Lihat semua role reward level."),
    ),
  category: "leveling",
  requiredPermissions: [PermissionFlagsBits.ManageGuild],
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const guildConfig = await GuildConfig.findOneAndUpdate(
      { guildId: interaction.guildId },
      { $setOnInsert: { guildId: interaction.guildId } },
      { upsert: true, new: true },
    );

    // `leveling` always exists at runtime (schema default), TS only marks nested paths optional.
    const leveling = guildConfig.leveling!;

    if (subcommand === "tambah") {
      const level = interaction.options.getInteger("level", true);
      const role = interaction.options.getRole("role", true);

      leveling.roleRewards.pull({ level });
      leveling.roleRewards.push({ level, roleId: role.id });
      await guildConfig.save();

      await interaction.reply({
        embeds: [
          successEmbed(
            `Role <@&${role.id}> akan diberikan otomatis saat member mencapai **Level ${level}**.`,
          ),
        ],
      });
      return;
    }

    if (subcommand === "hapus") {
      const level = interaction.options.getInteger("level", true);
      const originalCount = leveling.roleRewards.length;
      leveling.roleRewards.pull({ level });

      if (leveling.roleRewards.length === originalCount) {
        await interaction.reply({
          embeds: [errorEmbed(`Tidak ada role reward pada Level ${level}.`)],
          ephemeral: true,
        });
        return;
      }

      await guildConfig.save();
      await interaction.reply({
        embeds: [successEmbed(`Role reward pada Level ${level} dihapus.`)],
      });
      return;
    }

    if (leveling.roleRewards.length === 0) {
      await interaction.reply({
        embeds: [errorEmbed("Belum ada role reward yang diatur.")],
        ephemeral: true,
      });
      return;
    }

    const lines = [...leveling.roleRewards]
      .sort((a, b) => a.level - b.level)
      .map((reward) => `Level ${reward.level} → <@&${reward.roleId}>`);
    await interaction.reply({
      embeds: [
        buildEmbed("primary").setTitle("🎁 Role Reward Level").setDescription(lines.join("\n")),
      ],
    });
  },
};

export default command;
