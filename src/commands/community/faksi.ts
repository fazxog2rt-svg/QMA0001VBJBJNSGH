import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { GuildConfig } from "../../database/models/GuildConfig";
import { Faction } from "../../database/models/Faction";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";
import {
  buildFactionEmbed,
  createFaction,
  disbandFaction,
  donateToFaction,
  getFactionByName,
  getUserFaction,
  joinFaction,
  leaveFaction,
  listFactions,
} from "../../services/community/factionService";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("faksi")
    .setDescription("Faksi/kubu komunitas — bersaing di Perang Faksi mingguan.")
    .addSubcommand((s) =>
      s
        .setName("buat")
        .setDescription("Buat faksi baru (berbayar coins).")
        .addStringOption((o) =>
          o.setName("nama").setDescription("Nama faksi (3-32 karakter).").setRequired(true),
        )
        .addStringOption((o) => o.setName("emoji").setDescription("Emoji lambang faksi."))
        .addStringOption((o) => o.setName("warna").setDescription("Warna hex, mis. #ff0000.")),
    )
    .addSubcommand((s) =>
      s
        .setName("gabung")
        .setDescription("Gabung ke sebuah faksi.")
        .addStringOption((o) =>
          o.setName("nama").setDescription("Nama faksi yang dituju.").setRequired(true),
        ),
    )
    .addSubcommand((s) => s.setName("keluar").setDescription("Keluar dari faksimu."))
    .addSubcommand((s) => s.setName("bubar").setDescription("[Leader] Bubarkan faksimu."))
    .addSubcommand((s) =>
      s
        .setName("info")
        .setDescription("Lihat info faksi (default: faksimu).")
        .addStringOption((o) => o.setName("nama").setDescription("Nama faksi tertentu.")),
    )
    .addSubcommand((s) => s.setName("top").setDescription("Klasemen faksi guild ini."))
    .addSubcommand((s) =>
      s
        .setName("sumbang")
        .setDescription("Donasi coins ke kas faksimu (menambah poin kontribusi).")
        .addIntegerOption((o) =>
          o.setName("jumlah").setDescription("Jumlah coins.").setRequired(true).setMinValue(1),
        ),
    )
    .addSubcommand((s) =>
      s.setName("perang").setDescription("Lihat status Perang Faksi pekan ini."),
    )
    .addSubcommand((s) =>
      s
        .setName("konfig")
        .setDescription("[Admin] Atur channel pengumuman Perang Faksi.")
        .addChannelOption((o) =>
          o
            .setName("channel")
            .setDescription("Channel pengumuman.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    ),
  category: "community",
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [errorEmbed("Perintah ini hanya untuk di dalam server.")],
        ephemeral: true,
      });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    if (sub === "buat") {
      const nama = interaction.options.getString("nama", true);
      const emoji = interaction.options.getString("emoji") ?? undefined;
      const warna = interaction.options.getString("warna") ?? undefined;
      const result = await createFaction(guildId, userId, { name: nama, emoji, color: warna });
      if (!result.ok || !result.data) {
        await interaction.reply({ embeds: [errorEmbed(result.error!)], ephemeral: true });
        return;
      }
      await interaction.reply({
        embeds: [
          successEmbed(
            `Faksi ${result.data.emoji} **${result.data.name}** berhasil dibuat! Ajak member lain dengan \`/faksi gabung nama:${result.data.name}\`.`,
          ),
        ],
      });
      return;
    }

    if (sub === "gabung") {
      const nama = interaction.options.getString("nama", true);
      const result = await joinFaction(guildId, userId, nama);
      if (!result.ok || !result.data) {
        await interaction.reply({ embeds: [errorEmbed(result.error!)], ephemeral: true });
        return;
      }
      await interaction.reply({
        embeds: [
          successEmbed(`Kamu bergabung ke ${result.data.emoji} **${result.data.name}**! 🎉`),
        ],
      });
      return;
    }

    if (sub === "keluar") {
      const result = await leaveFaction(guildId, userId);
      await interaction.reply({
        embeds: [result.ok ? successEmbed("Kamu keluar dari faksimu.") : errorEmbed(result.error!)],
        ephemeral: !result.ok,
      });
      return;
    }

    if (sub === "bubar") {
      const result = await disbandFaction(guildId, userId);
      await interaction.reply({
        embeds: [result.ok ? successEmbed("Faksi dibubarkan.") : errorEmbed(result.error!)],
        ephemeral: !result.ok,
      });
      return;
    }

    if (sub === "info") {
      const nama = interaction.options.getString("nama");
      const faction = nama
        ? await getFactionByName(guildId, nama)
        : await (async () => {
            const m = await getUserFaction(guildId, userId);
            return m ? Faction.findById(m.factionId) : null;
          })();

      if (!faction) {
        await interaction.reply({
          embeds: [
            errorEmbed(
              nama
                ? "Faksi tidak ditemukan."
                : "Kamu belum punya faksi. Sebutkan nama faksi atau buat dengan `/faksi buat`.",
            ),
          ],
          ephemeral: true,
        });
        return;
      }
      await interaction.reply({ embeds: [await buildFactionEmbed(faction)] });
      return;
    }

    if (sub === "top") {
      const factions = await listFactions(guildId, 10);
      if (factions.length === 0) {
        await interaction.reply({
          embeds: [
            buildEmbed("info")
              .setTitle("🏰 Faksi")
              .setDescription("Belum ada faksi. Buat dengan `/faksi buat`!"),
          ],
        });
        return;
      }
      const medals = ["🥇", "🥈", "🥉"];
      const text = factions
        .map(
          (f, i) =>
            `${medals[i] ?? `**${i + 1}.**`} ${f.emoji} **${f.name}** — ${f.weeklyPoints} poin minggu ini _(total ${f.totalPoints} · ${f.wins}× juara)_`,
        )
        .join("\n");
      await interaction.reply({
        embeds: [buildEmbed("premium").setTitle("🏰 Klasemen Faksi").setDescription(text)],
      });
      return;
    }

    if (sub === "sumbang") {
      const jumlah = interaction.options.getInteger("jumlah", true);
      const result = await donateToFaction(guildId, userId, jumlah);
      if (!result.ok || !result.data) {
        await interaction.reply({ embeds: [errorEmbed(result.error!)], ephemeral: true });
        return;
      }
      await interaction.reply({
        embeds: [
          successEmbed(
            `Kamu menyumbang **${jumlah}** coins ke ${result.data.faction.emoji} **${result.data.faction.name}** (+${result.data.points} poin kontribusi). Kas sekarang: ${result.data.faction.treasury}.`,
          ),
        ],
      });
      return;
    }

    if (sub === "perang") {
      const factions = await listFactions(guildId, 5);
      const config = await GuildConfig.findOne({ guildId });
      if (factions.length === 0) {
        await interaction.reply({
          embeds: [
            buildEmbed("info")
              .setTitle("⚔️ Perang Faksi")
              .setDescription("Belum ada faksi yang bertanding."),
          ],
        });
        return;
      }
      const standings = factions
        .map(
          (f, i) =>
            `${["🥇", "🥈", "🥉"][i] ?? `**${i + 1}.**`} ${f.emoji} **${f.name}** — ${f.weeklyPoints} poin`,
        )
        .join("\n");
      const lastReset = config?.faksi?.lastWarResetAt;
      const footer = lastReset
        ? `Reset terakhir: ${lastReset.toLocaleDateString("id-ID")}. Perang direset tiap Senin 00:00 WIB.`
        : "Perang direset tiap Senin 00:00 WIB.";
      await interaction.reply({
        embeds: [
          buildEmbed("warning")
            .setTitle("⚔️ Perang Faksi — Pekan Ini")
            .setDescription(standings)
            .setFooter({ text: footer }),
        ],
      });
      return;
    }

    // konfig (admin)
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        embeds: [errorEmbed("Butuh izin **Manage Server** untuk konfigurasi.")],
        ephemeral: true,
      });
      return;
    }
    const channel = interaction.options.getChannel("channel", true);
    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { "faksi.announceChannelId": channel.id } },
      { upsert: true },
    );
    await interaction.reply({
      embeds: [successEmbed(`Pengumuman Perang Faksi akan dikirim ke <#${channel.id}>.`)],
    });
  },
};

export default command;
