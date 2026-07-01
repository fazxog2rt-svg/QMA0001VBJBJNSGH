import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { GuildConfig } from "../../database/models/GuildConfig";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ticket-config")
    .setDescription("[Admin] Konfigurasi sistem tiket.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("kategori-channel")
        .setDescription("Atur kategori Discord tempat channel tiket dibuat.")
        .addChannelOption((option) =>
          option.setName("kategori").setDescription("Kategori channel.").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("log-channel")
        .setDescription("Atur channel log tiket (transkrip dikirim ke sini).")
        .addChannelOption((option) =>
          option.setName("channel").setDescription("Channel log.").setRequired(true),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("support-role")
        .setDescription("Kelola role support tiket.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("tambah")
            .setDescription("Tambah role support.")
            .addRoleOption((option) =>
              option.setName("role").setDescription("Role support.").setRequired(true),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("hapus")
            .setDescription("Hapus role support.")
            .addRoleOption((option) =>
              option.setName("role").setDescription("Role support.").setRequired(true),
            ),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("tipe")
        .setDescription("Kelola tipe/kategori tiket.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("tambah")
            .setDescription("Tambah tipe tiket.")
            .addStringOption((option) =>
              option
                .setName("key")
                .setDescription("Kunci unik (huruf kecil, tanpa spasi).")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option.setName("label").setDescription("Nama tampilan.").setRequired(true),
            )
            .addStringOption((option) =>
              option.setName("emoji").setDescription("Emoji (default 🎫)."),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("hapus")
            .setDescription("Hapus tipe tiket.")
            .addStringOption((option) =>
              option.setName("key").setDescription("Kunci tipe tiket.").setRequired(true),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand.setName("list").setDescription("Lihat semua tipe tiket."),
        ),
    ),
  category: "tickets",
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
    const group = interaction.options.getSubcommandGroup(false);

    const guildConfig = await GuildConfig.findOneAndUpdate(
      { guildId: interaction.guildId },
      { $setOnInsert: { guildId: interaction.guildId } },
      { upsert: true, new: true },
    );

    // `tickets` always exists at runtime (schema default), TS only marks nested paths optional.
    const tickets = guildConfig.tickets!;

    if (!group && subcommand === "kategori-channel") {
      const kategori = interaction.options.getChannel("kategori", true);
      tickets.categoryChannelId = kategori.id;
      await guildConfig.save();
      await interaction.reply({
        embeds: [successEmbed(`Kategori channel tiket diatur ke <#${kategori.id}>.`)],
      });
      return;
    }

    if (!group && subcommand === "log-channel") {
      const channel = interaction.options.getChannel("channel", true);
      tickets.logChannelId = channel.id;
      await guildConfig.save();
      await interaction.reply({
        embeds: [successEmbed(`Channel log tiket diatur ke <#${channel.id}>.`)],
      });
      return;
    }

    if (group === "support-role") {
      const role = interaction.options.getRole("role", true);

      if (subcommand === "tambah") {
        if (tickets.supportRoleIds.includes(role.id)) {
          await interaction.reply({
            embeds: [errorEmbed("Role ini sudah menjadi support role.")],
            ephemeral: true,
          });
          return;
        }
        tickets.supportRoleIds.push(role.id);
        await guildConfig.save();
        await interaction.reply({
          embeds: [successEmbed(`<@&${role.id}> ditambahkan sebagai support role.`)],
        });
        return;
      }

      const originalLength = tickets.supportRoleIds.length;
      tickets.supportRoleIds = tickets.supportRoleIds.filter((roleId) => roleId !== role.id);
      if (tickets.supportRoleIds.length === originalLength) {
        await interaction.reply({
          embeds: [errorEmbed("Role ini bukan support role.")],
          ephemeral: true,
        });
        return;
      }
      await guildConfig.save();
      await interaction.reply({
        embeds: [successEmbed(`<@&${role.id}> dihapus dari support role.`)],
      });
      return;
    }

    if (group === "tipe") {
      if (subcommand === "tambah") {
        const key = interaction.options.getString("key", true).toLowerCase().replaceAll(" ", "-");
        const label = interaction.options.getString("label", true);
        const emoji = interaction.options.getString("emoji") ?? "🎫";

        tickets.ticketTypes.pull({ key });
        tickets.ticketTypes.push({ key, label, emoji });
        await guildConfig.save();

        await interaction.reply({ embeds: [successEmbed(`Tipe tiket **${label}** ditambahkan.`)] });
        return;
      }

      if (subcommand === "hapus") {
        const key = interaction.options.getString("key", true);
        const originalLength = tickets.ticketTypes.length;
        tickets.ticketTypes.pull({ key });

        if (tickets.ticketTypes.length === originalLength) {
          await interaction.reply({
            embeds: [errorEmbed("Tipe tiket tidak ditemukan.")],
            ephemeral: true,
          });
          return;
        }

        await guildConfig.save();
        await interaction.reply({ embeds: [successEmbed("Tipe tiket dihapus.")] });
        return;
      }

      const lines = tickets.ticketTypes.map(
        (type) => `${type.emoji} **${type.label}** (\`${type.key}\`)`,
      );
      await interaction.reply({
        embeds: [
          buildEmbed("primary")
            .setTitle("🎫 Tipe Tiket")
            .setDescription(lines.join("\n") || "_Belum ada tipe tiket._"),
        ],
      });
    }
  },
};

export default command;
