import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  SlashCommandBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { SlashCommand } from "../../types/command";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";
import { logger } from "../../services/logger.service";
import { RPG_CLASSES, RPG_SHOP, isRpgClass, pickMonster, rpgXpForLevel } from "../../config/rpg";
import {
  applyXp,
  buyShopItem,
  createCharacter,
  effectiveAttack,
  effectiveDefense,
  getCharacter,
  type RpgChar,
} from "../../services/community/rpgService";

const COMBAT_MS = 120_000;

function rnd(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function hpBar(current: number, max: number): string {
  const ratio = Math.max(0, Math.min(1, current / max));
  const filled = Math.round(ratio * 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

function combatRow(disabled = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("rpg:atk")
      .setLabel("Serang")
      .setEmoji("⚔️")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId("rpg:pot")
      .setLabel("Ramuan")
      .setEmoji("🧪")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId("rpg:flee")
      .setLabel("Kabur")
      .setEmoji("🏃")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
  );
}

async function startCharacter(interaction: ChatInputCommandInteraction): Promise<void> {
  const kelas = interaction.options.getString("kelas", true);
  if (!isRpgClass(kelas)) {
    await interaction.reply({ embeds: [errorEmbed("Kelas tidak dikenal.")], ephemeral: true });
    return;
  }
  const result = await createCharacter(interaction.guildId!, interaction.user.id, kelas);
  if (!result.ok || !result.data) {
    await interaction.reply({ embeds: [errorEmbed(result.error!)], ephemeral: true });
    return;
  }
  const cls = RPG_CLASSES[kelas]!;
  await interaction.reply({
    embeds: [
      successEmbed(
        `Karakter **${cls.emoji} ${cls.label}** dibuat! HP ${cls.maxHp}, ATK ${cls.attack}, DEF ${cls.defense}. ` +
          "Mulai bertualang dengan `/rpg jelajah`.",
      ),
    ],
  });
}

function statusEmbed(char: RpgChar) {
  const cls = RPG_CLASSES[char.className];
  return buildEmbed("primary")
    .setTitle(
      `${cls?.emoji ?? "🧙"} Karakter ${cls?.label ?? char.className} — Level ${char.level}`,
    )
    .setDescription(`\`${hpBar(char.hp, char.maxHp)}\` HP ${char.hp}/${char.maxHp}`)
    .addFields(
      { name: "⚔️ Attack", value: `${effectiveAttack(char)}`, inline: true },
      { name: "🛡️ Defense", value: `${effectiveDefense(char)}`, inline: true },
      { name: "✨ XP", value: `${char.xp}/${rpgXpForLevel(char.level)}`, inline: true },
      { name: "💰 Gold", value: `${char.gold}`, inline: true },
      { name: "🧪 Ramuan", value: `${char.potions}`, inline: true },
      { name: "📊 W/L", value: `${char.wins}/${char.losses}`, inline: true },
      {
        name: "Perlengkapan",
        value: `⚔️ ${char.weaponName ?? "—"} · 🛡️ ${char.armorName ?? "—"}`,
      },
    );
}

async function showStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  const char = await getCharacter(interaction.guildId!, interaction.user.id);
  if (!char) {
    await interaction.reply({
      embeds: [errorEmbed("Kamu belum punya karakter. Buat dengan `/rpg mulai kelas:`.")],
      ephemeral: true,
    });
    return;
  }
  await interaction.reply({ embeds: [statusEmbed(char)] });
}

async function adventure(interaction: ChatInputCommandInteraction): Promise<void> {
  const char = await getCharacter(interaction.guildId!, interaction.user.id);
  if (!char) {
    await interaction.reply({
      embeds: [errorEmbed("Kamu belum punya karakter. Buat dengan `/rpg mulai kelas:`.")],
      ephemeral: true,
    });
    return;
  }

  if (char.hp <= 0) char.hp = char.maxHp; // pulih sebelum bertualang lagi

  const monster = pickMonster(char.level);
  let monsterHp = monster.hp;
  const log: string[] = [`Kamu bertemu ${monster.emoji} **${monster.name}**!`];

  const render = (footer: string) =>
    buildEmbed("warning")
      .setTitle(`⚔️ Pertarungan — ${monster.emoji} ${monster.name}`)
      .setDescription(
        `**Kamu**\n\`${hpBar(char.hp, char.maxHp)}\` ${char.hp}/${char.maxHp}\n\n` +
          `**${monster.name}**\n\`${hpBar(monsterHp, monster.hp)}\` ${Math.max(0, monsterHp)}/${monster.hp}\n\n` +
          log.slice(-4).join("\n"),
      )
      .setFooter({ text: footer });

  await interaction.reply({
    embeds: [render("Pilih aksimu!")],
    components: [combatRow()],
  });
  const sent = await interaction.fetchReply();

  // Objek pembungkus agar TypeScript tidak mempersempit tipe literal saat
  // nilai diubah di dalam callback collector.
  const state: { outcome: "menang" | "kalah" | "kabur" | "timeout" } = { outcome: "timeout" };

  await new Promise<void>((resolve) => {
    const collector = sent.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: COMBAT_MS,
      filter: (btn) => btn.user.id === interaction.user.id,
    });

    collector.on("collect", async (btn: ButtonInteraction) => {
      const action = btn.customId.split(":")[1];

      if (action === "flee") {
        if (Math.random() < 0.5) {
          log.push("🏃 Kamu berhasil kabur!");
          state.outcome = "kabur";
          collector.stop();
          await btn.update({ embeds: [render("Kamu kabur.")], components: [combatRow(true)] });
          return;
        }
        const dmg = Math.max(1, monster.attack - effectiveDefense(char) + rnd(-1, 2));
        char.hp -= dmg;
        log.push(`Gagal kabur! ${monster.name} menyerang (-${dmg} HP).`);
      } else if (action === "pot") {
        if (char.potions <= 0) {
          log.push("Kamu tidak punya ramuan!");
        } else {
          char.potions -= 1;
          const heal = Math.round(char.maxHp * 0.5);
          char.hp = Math.min(char.maxHp, char.hp + heal);
          log.push(`🧪 Kamu minum ramuan (+${heal} HP).`);
          const dmg = Math.max(1, monster.attack - effectiveDefense(char) + rnd(-1, 2));
          char.hp -= dmg;
          log.push(`${monster.name} menyerang (-${dmg} HP).`);
        }
      } else {
        // serang
        const dmg = Math.max(1, effectiveAttack(char) + rnd(-2, 3));
        monsterHp -= dmg;
        log.push(`⚔️ Kamu menyerang (-${dmg} HP musuh).`);
        if (monsterHp > 0) {
          const back = Math.max(1, monster.attack - effectiveDefense(char) + rnd(-1, 2));
          char.hp -= back;
          log.push(`${monster.name} balas menyerang (-${back} HP).`);
        }
      }

      if (monsterHp <= 0) {
        state.outcome = "menang";
        await btn.deferUpdate().catch(() => undefined);
        collector.stop();
        return;
      }
      if (char.hp <= 0) {
        state.outcome = "kalah";
        await btn.deferUpdate().catch(() => undefined);
        collector.stop();
        return;
      }

      await btn
        .update({ embeds: [render("Pilih aksimu!")], components: [combatRow()] })
        .catch(() => undefined);
    });

    collector.on("end", () => resolve());
  });

  // Terapkan hasil & simpan.
  let resultEmbed = statusEmbed(char);
  if (state.outcome === "menang") {
    char.wins += 1;
    char.gold += monster.goldReward;
    const lvl = applyXp(char, monster.xpReward);
    log.push(
      `🏆 Kamu mengalahkan ${monster.name}! +${monster.xpReward} XP, +${monster.goldReward} gold.`,
    );
    if (lvl.leveledUp) log.push(`⬆️ Naik ke **Level ${lvl.newLevel}**! HP pulih penuh.`);
    resultEmbed = buildEmbed("success")
      .setTitle("🏆 Menang!")
      .setDescription(log.slice(-5).join("\n"));
  } else if (state.outcome === "kalah") {
    char.losses += 1;
    const lost = Math.min(char.gold, Math.round(char.gold * 0.2));
    char.gold -= lost;
    char.hp = char.maxHp;
    log.push(`💀 Kamu kalah dari ${monster.name}. Kehilangan ${lost} gold, lalu pulih di kota.`);
    resultEmbed = buildEmbed("danger")
      .setTitle("💀 Kalah")
      .setDescription(log.slice(-5).join("\n"));
  } else if (state.outcome === "kabur") {
    resultEmbed = buildEmbed("warning")
      .setTitle("🏃 Kabur")
      .setDescription(log.slice(-4).join("\n"));
  } else {
    log.push("⏱️ Waktu habis, pertarungan berakhir.");
    resultEmbed = buildEmbed("warning")
      .setTitle("⏱️ Selesai")
      .setDescription(log.slice(-4).join("\n"));
  }

  try {
    await char.save();
  } catch (error) {
    logger.warn("Gagal menyimpan karakter RPG", {
      error: error instanceof Error ? error.message : error,
    });
  }

  await interaction
    .editReply({ embeds: [resultEmbed], components: [combatRow(true)] })
    .catch(() => undefined);
}

async function showShop(interaction: ChatInputCommandInteraction): Promise<void> {
  const char = await getCharacter(interaction.guildId!, interaction.user.id);
  const text = RPG_SHOP.map(
    (item) =>
      `${item.emoji} **${item.label}** \`${item.key}\` — ${item.price} gold ` +
      `(${item.kind === "potion" ? `+${item.bonus}% HP` : item.kind === "weapon" ? `+${item.bonus} ATK` : `+${item.bonus} DEF`})`,
  ).join("\n");
  await interaction.reply({
    embeds: [
      buildEmbed("premium")
        .setTitle("🏪 Toko Petualang")
        .setDescription(text)
        .setFooter({ text: `Gold-mu: ${char?.gold ?? 0} • Beli: /rpg beli item:<kode>` }),
    ],
  });
}

async function buyItem(interaction: ChatInputCommandInteraction): Promise<void> {
  const item = interaction.options.getString("item", true);
  const result = await buyShopItem(interaction.guildId!, interaction.user.id, item);
  if (!result.ok || !result.data) {
    await interaction.reply({ embeds: [errorEmbed(result.error!)], ephemeral: true });
    return;
  }
  await interaction.reply({
    embeds: [
      successEmbed(
        `Kamu membeli **${result.data.label}**.` +
          (result.data.equipped ? " Otomatis dipakai! 🎽" : ""),
      ),
    ],
  });
}

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("rpg")
    .setDescription("Petualangan RPG: karakter persisten, dungeon, & pertarungan giliran.")
    .addSubcommand((s) =>
      s
        .setName("mulai")
        .setDescription("Buat karakter RPG-mu.")
        .addStringOption((o) =>
          o
            .setName("kelas")
            .setDescription("Pilih kelas.")
            .setRequired(true)
            .addChoices(
              ...Object.values(RPG_CLASSES).map((c) => ({
                name: `${c.emoji} ${c.label}`,
                value: c.key,
              })),
            ),
        ),
    )
    .addSubcommand((s) => s.setName("status").setDescription("Lihat karaktermu."))
    .addSubcommand((s) => s.setName("jelajah").setDescription("Cari monster & bertarung."))
    .addSubcommand((s) => s.setName("toko").setDescription("Lihat toko petualang."))
    .addSubcommand((s) =>
      s
        .setName("beli")
        .setDescription("Beli item dari toko dengan gold.")
        .addStringOption((o) =>
          o
            .setName("item")
            .setDescription("Kode item.")
            .setRequired(true)
            .addChoices(...RPG_SHOP.map((i) => ({ name: `${i.emoji} ${i.label}`, value: i.key }))),
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
    if (sub === "mulai") return startCharacter(interaction);
    if (sub === "status") return showStatus(interaction);
    if (sub === "jelajah") return adventure(interaction);
    if (sub === "toko") return showShop(interaction);
    return buyItem(interaction);
  },
};

export default command;
