import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { GuildConfig } from "../../database/models/GuildConfig";
import { errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("security-config")
    .setDescription("[Admin] Konfigurasi fitur keamanan server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("log-channel")
        .setDescription("Atur channel log keamanan.")
        .addChannelOption((option) =>
          option.setName("channel").setDescription("Channel log keamanan.").setRequired(true),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("automod")
        .setDescription("Kelola auto moderasi pesan.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("atur")
            .setDescription("Aktif/nonaktifkan filter auto moderasi.")
            .addStringOption((option) =>
              option
                .setName("fitur")
                .setDescription("Fitur yang diatur.")
                .setRequired(true)
                .addChoices(
                  { name: "Anti Spam", value: "antiSpam" },
                  { name: "Anti Invite", value: "antiInvite" },
                  { name: "Anti Link", value: "antiLink" },
                  { name: "Anti Scam", value: "antiScam" },
                  { name: "Anti Mention Spam", value: "antiMentionSpam" },
                ),
            )
            .addBooleanOption((option) =>
              option.setName("aktif").setDescription("Aktifkan?").setRequired(true),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("max-mention")
            .setDescription("Atur jumlah maksimal mention per pesan.")
            .addIntegerOption((option) =>
              option
                .setName("jumlah")
                .setDescription("Jumlah maksimal.")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(50),
            ),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("raid")
        .setDescription("Kelola anti-raid.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("atur")
            .setDescription("Aktif/nonaktifkan anti-raid.")
            .addBooleanOption((option) =>
              option.setName("aktif").setDescription("Aktifkan?").setRequired(true),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("threshold")
            .setDescription("Atur ambang batas join mencurigakan.")
            .addIntegerOption((option) =>
              option
                .setName("jumlah")
                .setDescription("Jumlah join.")
                .setRequired(true)
                .setMinValue(3)
                .setMaxValue(100),
            )
            .addIntegerOption((option) =>
              option
                .setName("detik")
                .setDescription("Dalam berapa detik.")
                .setRequired(true)
                .setMinValue(5)
                .setMaxValue(300),
            ),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("nuke")
        .setDescription("Kelola anti-nuke.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("atur")
            .setDescription("Aktif/nonaktifkan anti-nuke.")
            .addBooleanOption((option) =>
              option.setName("aktif").setDescription("Aktifkan?").setRequired(true),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("threshold")
            .setDescription("Atur ambang batas aksi destruktif.")
            .addIntegerOption((option) =>
              option
                .setName("jumlah")
                .setDescription("Jumlah aksi.")
                .setRequired(true)
                .setMinValue(2)
                .setMaxValue(20),
            )
            .addIntegerOption((option) =>
              option
                .setName("detik")
                .setDescription("Dalam berapa detik.")
                .setRequired(true)
                .setMinValue(10)
                .setMaxValue(600),
            ),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("verifikasi")
        .setDescription("Kelola verifikasi member baru.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("captcha")
            .setDescription("Aktif/nonaktifkan captcha member baru.")
            .addBooleanOption((option) =>
              option.setName("aktif").setDescription("Aktifkan?").setRequired(true),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("role")
            .setDescription("Atur role verified/unverified.")
            .addRoleOption((option) =>
              option
                .setName("unverified")
                .setDescription("Role sebelum verifikasi.")
                .setRequired(true),
            )
            .addRoleOption((option) =>
              option
                .setName("verified")
                .setDescription("Role setelah verifikasi.")
                .setRequired(true),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("alt-threshold")
            .setDescription("Atur umur akun minimal (jam) sebelum dianggap alt.")
            .addIntegerOption((option) =>
              option
                .setName("jam")
                .setDescription("Jumlah jam.")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(720),
            ),
        ),
    ),
  category: "security",
  requiredPermissions: [PermissionFlagsBits.Administrator],
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

    const autoMod = guildConfig.autoMod!;
    const security = guildConfig.security!;

    if (!group && subcommand === "log-channel") {
      const channel = interaction.options.getChannel("channel", true);
      security.logChannelId = channel.id;
      await guildConfig.save();
      await interaction.reply({
        embeds: [successEmbed(`Channel log keamanan diatur ke <#${channel.id}>.`)],
      });
      return;
    }

    if (group === "automod") {
      if (subcommand === "atur") {
        const fitur = interaction.options.getString("fitur", true) as keyof typeof autoMod;
        const aktif = interaction.options.getBoolean("aktif", true);
        (autoMod as unknown as Record<string, boolean>)[fitur] = aktif;
        await guildConfig.save();
        await interaction.reply({
          embeds: [successEmbed(`${fitur} ${aktif ? "diaktifkan" : "dinonaktifkan"}.`)],
        });
        return;
      }

      const jumlah = interaction.options.getInteger("jumlah", true);
      autoMod.maxMentionsPerMessage = jumlah;
      await guildConfig.save();
      await interaction.reply({
        embeds: [successEmbed(`Maksimal mention per pesan diatur ke **${jumlah}**.`)],
      });
      return;
    }

    if (group === "raid") {
      if (subcommand === "atur") {
        const aktif = interaction.options.getBoolean("aktif", true);
        security.antiRaid = aktif;
        await guildConfig.save();
        await interaction.reply({
          embeds: [successEmbed(`Anti-raid ${aktif ? "diaktifkan" : "dinonaktifkan"}.`)],
        });
        return;
      }

      const jumlah = interaction.options.getInteger("jumlah", true);
      const detik = interaction.options.getInteger("detik", true);
      security.raidJoinThreshold = jumlah;
      security.raidJoinWindowSeconds = detik;
      await guildConfig.save();
      await interaction.reply({
        embeds: [
          successEmbed(
            `Anti-raid akan terpicu jika **${jumlah} member** join dalam **${detik} detik**.`,
          ),
        ],
      });
      return;
    }

    if (group === "nuke") {
      if (subcommand === "atur") {
        const aktif = interaction.options.getBoolean("aktif", true);
        security.antiNuke = aktif;
        await guildConfig.save();
        await interaction.reply({
          embeds: [successEmbed(`Anti-nuke ${aktif ? "diaktifkan" : "dinonaktifkan"}.`)],
        });
        return;
      }

      const jumlah = interaction.options.getInteger("jumlah", true);
      const detik = interaction.options.getInteger("detik", true);
      security.antiNukeMaxActions = jumlah;
      security.antiNukeWindowSeconds = detik;
      await guildConfig.save();
      await interaction.reply({
        embeds: [
          successEmbed(
            `Anti-nuke akan terpicu jika **${jumlah} aksi destruktif** dalam **${detik} detik** oleh orang yang sama.`,
          ),
        ],
      });
      return;
    }

    if (group === "verifikasi") {
      if (subcommand === "captcha") {
        const aktif = interaction.options.getBoolean("aktif", true);
        security.captchaVerification = aktif;
        await guildConfig.save();
        await interaction.reply({
          embeds: [successEmbed(`Captcha member baru ${aktif ? "diaktifkan" : "dinonaktifkan"}.`)],
        });
        return;
      }

      if (subcommand === "role") {
        const unverified = interaction.options.getRole("unverified", true);
        const verified = interaction.options.getRole("verified", true);
        security.unverifiedRoleId = unverified.id;
        security.verifiedRoleId = verified.id;
        await guildConfig.save();
        await interaction.reply({
          embeds: [
            successEmbed(
              `Role verifikasi diatur: unverified=<@&${unverified.id}>, verified=<@&${verified.id}>.`,
            ),
          ],
        });
        return;
      }

      const jam = interaction.options.getInteger("jam", true);
      security.altDetectionMinAccountAgeHours = jam;
      await guildConfig.save();
      await interaction.reply({
        embeds: [
          successEmbed(
            `Akun yang berumur di bawah **${jam} jam** akan ditandai sebagai kemungkinan alt.`,
          ),
        ],
      });
    }
  },
};

export default command;
