import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type GuildTextBasedChannel,
} from "discord.js";
import type { SlashCommand } from "../../types/command";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";
import {
  buildTrialEmbed,
  createTrial,
  getTrial,
  listActiveTrials,
} from "../../services/moderation/trialService";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("sidang")
    .setDescription("[Mod] Jadwal sidang member bermasalah sebelum diputuskan.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((s) =>
      s
        .setName("buat")
        .setDescription("Jadwalkan sidang baru.")
        .addUserOption((o) =>
          o.setName("terdakwa").setDescription("Member yang disidang.").setRequired(true),
        )
        .addStringOption((o) =>
          o
            .setName("perkara")
            .setDescription("Alasan/perkara.")
            .setRequired(true)
            .setMaxLength(1000),
        )
        .addStringOption((o) =>
          o
            .setName("tipe")
            .setDescription("Terbuka (umum, ada syarat) / Tertutup (khusus).")
            .setRequired(true)
            .addChoices(
              { name: "🔓 Terbuka", value: "terbuka" },
              { name: "🔒 Tertutup", value: "tertutup" },
            ),
        )
        .addIntegerOption((o) =>
          o
            .setName("menit")
            .setDescription("Sidang dimulai berapa menit lagi.")
            .setRequired(true)
            .setMinValue(1),
        )
        .addChannelOption((o) =>
          o
            .setName("channel")
            .setDescription("Channel pengumuman sidang.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        )
        .addIntegerOption((o) =>
          o
            .setName("min-level")
            .setDescription("[Terbuka] Syarat level minimal ikut.")
            .setMinValue(0),
        )
        .addRoleOption((o) => o.setName("role").setDescription("[Terbuka] Syarat role untuk ikut."))
        .addUserOption((o) =>
          o.setName("izinkan1").setDescription("[Tertutup] Pihak yang diizinkan."),
        )
        .addUserOption((o) =>
          o.setName("izinkan2").setDescription("[Tertutup] Pihak yang diizinkan."),
        )
        .addUserOption((o) =>
          o.setName("izinkan3").setDescription("[Tertutup] Pihak yang diizinkan."),
        ),
    )
    .addSubcommand((s) => s.setName("list").setDescription("Daftar sidang aktif."))
    .addSubcommand((s) =>
      s
        .setName("batal")
        .setDescription("Batalkan sidang.")
        .addIntegerOption((o) =>
          o.setName("nomor").setDescription("Nomor kasus.").setRequired(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("putusan")
        .setDescription("Tetapkan putusan & selesaikan sidang.")
        .addIntegerOption((o) =>
          o.setName("nomor").setDescription("Nomor kasus.").setRequired(true),
        )
        .addStringOption((o) =>
          o.setName("hasil").setDescription("Isi putusan.").setRequired(true).setMaxLength(1000),
        ),
    ),
  category: "moderation",
  requiredPermissions: [PermissionFlagsBits.ModerateMembers],
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.guild) return;
    const sub = interaction.options.getSubcommand();

    if (sub === "buat") {
      const terdakwa = interaction.options.getUser("terdakwa", true);
      const perkara = interaction.options.getString("perkara", true);
      const tipe = interaction.options.getString("tipe", true) as "terbuka" | "tertutup";
      const menit = interaction.options.getInteger("menit", true);
      const channel = interaction.options.getChannel("channel", true) as GuildTextBasedChannel;
      const minLevel = interaction.options.getInteger("min-level") ?? 0;
      const role = interaction.options.getRole("role");
      const allowed = ["izinkan1", "izinkan2", "izinkan3"]
        .map((n) => interaction.options.getUser(n)?.id)
        .filter((id): id is string => Boolean(id));

      const scheduledAt = new Date(Date.now() + menit * 60_000);

      const trial = await createTrial({
        guildId: interaction.guildId,
        defendantId: terdakwa.id,
        reason: perkara,
        type: tipe,
        scheduledAt,
        announceChannelId: channel.id,
        createdBy: interaction.user.id,
        minLevel,
        roleId: role?.id,
        allowedUserIds: allowed,
      });

      const components =
        tipe === "terbuka"
          ? [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setCustomId(`trial:join:${trial.caseNumber}`)
                  .setLabel("Ikut Sidang")
                  .setEmoji("🙋")
                  .setStyle(ButtonStyle.Primary),
              ),
            ]
          : [];

      const sent = await channel
        .send({ embeds: [buildTrialEmbed(trial)], components })
        .catch(() => null);
      if (sent) {
        trial.announceMessageId = sent.id;
        await trial.save();
      }

      await interaction.reply({
        embeds: [
          successEmbed(
            `Sidang **#${trial.caseNumber}** dijadwalkan & diumumkan di <#${channel.id}>.`,
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    if (sub === "list") {
      const trials = await listActiveTrials(interaction.guildId);
      if (trials.length === 0) {
        await interaction.reply({
          embeds: [buildEmbed("primary").setDescription("Tidak ada sidang aktif.")],
          ephemeral: true,
        });
        return;
      }
      const lines = trials.map((t) => {
        const ts = Math.floor(t.scheduledAt.getTime() / 1000);
        return `**#${t.caseNumber}** — <@${t.defendantId}> · ${t.type} · ${t.status} · <t:${ts}:R>`;
      });
      await interaction.reply({
        embeds: [
          buildEmbed("primary").setTitle("⚖️ Sidang Aktif").setDescription(lines.join("\n")),
        ],
        ephemeral: true,
      });
      return;
    }

    if (sub === "batal") {
      const nomor = interaction.options.getInteger("nomor", true);
      const trial = await getTrial(interaction.guildId, nomor);
      if (!trial || trial.status === "selesai" || trial.status === "dibatalkan") {
        await interaction.reply({
          embeds: [errorEmbed("Sidang tidak ditemukan / sudah selesai.")],
          ephemeral: true,
        });
        return;
      }
      trial.status = "dibatalkan";
      await trial.save();
      await interaction.reply({ embeds: [successEmbed(`Sidang **#${nomor}** dibatalkan.`)] });
      return;
    }

    // putusan
    const nomor = interaction.options.getInteger("nomor", true);
    const hasil = interaction.options.getString("hasil", true);
    const trial = await getTrial(interaction.guildId, nomor);
    if (!trial || trial.status === "dibatalkan") {
      await interaction.reply({ embeds: [errorEmbed("Sidang tidak ditemukan.")], ephemeral: true });
      return;
    }
    trial.verdict = hasil;
    trial.status = "selesai";
    await trial.save();

    const channel = await interaction.guild.channels
      .fetch(trial.announceChannelId)
      .catch(() => null);
    if (channel?.isTextBased() && "send" in channel) {
      await channel
        .send({ content: `⚖️ **Putusan Sidang #${nomor}**`, embeds: [buildTrialEmbed(trial)] })
        .catch(() => undefined);
    }
    await interaction.reply({
      embeds: [successEmbed(`Putusan sidang **#${nomor}** ditetapkan.`)],
      ephemeral: true,
    });
  },
};

export default command;
