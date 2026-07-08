import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type GuildTextBasedChannel,
} from "discord.js";
import type { SlashCommand } from "../../types/command";
import { buildEmbed, errorEmbed } from "../../utils/embed";
import { logger } from "../../services/logger.service";
import { addFactionContribution } from "../../services/community/factionService";
import { addSeasonXp, trackSeasonMission } from "../../services/community/seasonService";
import {
  generateQuizQuestions,
  getQuizLeaderboard,
  persistQuizResults,
  scoreAnswer,
  type PlayerResult,
  type QuizDifficulty,
  type QuizQuestion,
} from "../../services/fun/quizService";

const OPTION_LABELS = ["🇦", "🇧", "🇨", "🇩"] as const;
const ROUND_MS = 20_000; // waktu menjawab per soal
const REVEAL_MS = 4_000; // jeda sebelum soal berikutnya

// Kontrol sesi aktif per-channel. Kunci = channelId. Dipakai untuk mencegah
// dua kuis berjalan bersamaan dan agar `/trivia stop` bisa menghentikan game.
const activeSessions = new Map<string, { stop: boolean }>();

interface Scoreboard {
  points: Map<string, number>;
  correct: Map<string, number>;
  streak: Map<string, number>;
  bestStreak: Map<string, number>;
}

function inc(map: Map<string, number>, key: string, by: number): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

function buildQuestionEmbed(q: QuizQuestion, index: number, total: number) {
  const optionsText = q.options.map((opt, i) => `${OPTION_LABELS[i]} ${opt}`).join("\n");
  return buildEmbed("primary")
    .setTitle(`🧠 Cerdas Cermat — Soal ${index + 1}/${total}`)
    .setDescription(`**${q.question}**\n\n${optionsText}`)
    .setFooter({ text: `Punya ${ROUND_MS / 1000} detik! Jawab tercepat = poin lebih besar.` });
}

function buildAnswerRow(disabled = false, correctIndex?: number): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    OPTION_LABELS.map((label, i) =>
      new ButtonBuilder()
        .setCustomId(`quiz:${i}`)
        .setEmoji(label)
        .setStyle(correctIndex === i ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(disabled),
    ),
  );
}

function topScorers(board: Scoreboard, limit: number): [string, number][] {
  return [...board.points.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

/** Jalankan satu ronde: kirim soal, kumpulkan jawaban, skor, dan bongkar kunci. */
async function runRound(
  channel: GuildTextBasedChannel,
  q: QuizQuestion,
  index: number,
  total: number,
  board: Scoreboard,
): Promise<void> {
  const message = await channel.send({
    embeds: [buildQuestionEmbed(q, index, total)],
    components: [buildAnswerRow(false)],
  });

  const roundStart = Date.now();
  const answers = new Map<string, { correct: boolean; at: number }>();

  await new Promise<void>((resolve) => {
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: ROUND_MS,
    });

    collector.on("collect", (btn: ButtonInteraction) => {
      if (answers.has(btn.user.id)) {
        void btn.reply({ content: "Kamu sudah menjawab soal ini. 🙌", ephemeral: true });
        return;
      }
      const chosen = Number(btn.customId.split(":")[1]);
      answers.set(btn.user.id, { correct: chosen === q.correctIndex, at: Date.now() });
      void btn.reply({ content: "Jawaban tercatat! ✅", ephemeral: true });
    });

    collector.on("end", () => resolve());
  });

  // Skoring: yang benar dapat poin (kecepatan + rentetan); yang salah/absen reset streak.
  const respondents = new Set(answers.keys());
  for (const [userId, ans] of answers) {
    if (ans.correct) {
      const msRemaining = ROUND_MS - (ans.at - roundStart);
      const streak = (board.streak.get(userId) ?? 0) + 1;
      board.streak.set(userId, streak);
      board.bestStreak.set(userId, Math.max(board.bestStreak.get(userId) ?? 0, streak));
      inc(board.points, userId, scoreAnswer(msRemaining, ROUND_MS, streak - 1));
      inc(board.correct, userId, 1);
    } else {
      board.streak.set(userId, 0);
    }
  }
  // Pemain yang pernah ikut tapi tidak menjawab ronde ini: streak putus.
  for (const userId of board.points.keys()) {
    if (!respondents.has(userId)) board.streak.set(userId, 0);
  }

  const benar = [...answers.values()].filter((a) => a.correct).length;
  const top = topScorers(board, 5)
    .map(([userId, pts], i) => `${i + 1}. <@${userId}> — **${pts}** poin`)
    .join("\n");

  await message
    .edit({
      embeds: [
        buildEmbed("success")
          .setTitle(`✅ Jawaban: ${OPTION_LABELS[q.correctIndex]} ${q.options[q.correctIndex]}`)
          .setDescription(
            `${answers.size} orang menjawab, **${benar}** benar.` +
              (top ? `\n\n**🏆 Papan Sementara**\n${top}` : ""),
          ),
      ],
      components: [buildAnswerRow(true, q.correctIndex)],
    })
    .catch(() => undefined);
}

async function startGame(interaction: ChatInputCommandInteraction): Promise<void> {
  const channel = interaction.channel;
  if (!channel || !channel.isTextBased() || channel.isDMBased()) {
    await interaction.reply({
      embeds: [errorEmbed("Kuis hanya bisa dijalankan di channel teks server.")],
      ephemeral: true,
    });
    return;
  }
  if (activeSessions.has(channel.id)) {
    await interaction.reply({
      embeds: [
        errorEmbed("Sudah ada kuis berjalan di channel ini. Selesaikan dulu atau `/trivia stop`."),
      ],
      ephemeral: true,
    });
    return;
  }

  const topic = interaction.options.getString("topik") ?? "";
  const difficulty = (interaction.options.getString("tingkat") ?? "sedang") as QuizDifficulty;
  const count = interaction.options.getInteger("jumlah") ?? 5;

  const controller = { stop: false };
  activeSessions.set(channel.id, controller);

  await interaction.reply({
    embeds: [
      buildEmbed("premium")
        .setTitle("🧠 Cerdas Cermat dimulai!")
        .setDescription(
          `Menyiapkan **${count}** soal${topic ? ` bertema **${topic}**` : ""} ` +
            `(tingkat **${difficulty}**)...\n\nSemua orang boleh ikut — jawab lewat tombol! ` +
            "Tercepat & beruntun (streak) dapat poin lebih besar.",
        )
        .setFooter({ text: "Host bisa hentikan kapan saja dengan /trivia stop" }),
    ],
  });

  const board: Scoreboard = {
    points: new Map(),
    correct: new Map(),
    streak: new Map(),
    bestStreak: new Map(),
  };

  try {
    const questions = await generateQuizQuestions(topic, difficulty, count);
    const guildChannel = channel as GuildTextBasedChannel;

    for (let i = 0; i < questions.length; i += 1) {
      if (controller.stop) break;
      await runRound(guildChannel, questions[i]!, i, questions.length, board);
      const isLast = i === questions.length - 1;
      if (!isLast && !controller.stop) {
        await new Promise((r) => setTimeout(r, REVEAL_MS));
      }
    }

    await finishGame(guildChannel, interaction.guildId!, board, controller.stop);
  } catch (error) {
    logger.error("Kuis cerdas cermat gagal", {
      error: error instanceof Error ? error.message : error,
    });
    await channel
      .send({ embeds: [errorEmbed("Terjadi kesalahan saat menjalankan kuis.")] })
      .catch(() => undefined);
  } finally {
    activeSessions.delete(channel.id);
  }
}

async function finishGame(
  channel: GuildTextBasedChannel,
  guildId: string,
  board: Scoreboard,
  stopped: boolean,
): Promise<void> {
  const ranking = topScorers(board, 10);

  if (ranking.length === 0) {
    await channel
      .send({
        embeds: [
          buildEmbed("warning")
            .setTitle(stopped ? "🛑 Kuis dihentikan" : "🏁 Kuis selesai")
            .setDescription("Tidak ada satu pun jawaban benar. Coba lagi lain kali! 💪"),
        ],
      })
      .catch(() => undefined);
    return;
  }

  const medals = ["🥇", "🥈", "🥉"];
  const board_text = ranking
    .map(([userId, pts], i) => {
      const medal = medals[i] ?? `**${i + 1}.**`;
      const benar = board.correct.get(userId) ?? 0;
      const streak = board.bestStreak.get(userId) ?? 0;
      return `${medal} <@${userId}> — **${pts}** poin _(${benar} benar · streak ${streak})_`;
    })
    .join("\n");

  await channel
    .send({
      content: `🎉 <@${ranking[0]![0]}> jadi juaranya!`,
      embeds: [
        buildEmbed("premium")
          .setTitle(stopped ? "🛑 Kuis dihentikan — Hasil" : "🏁 Hasil Akhir Cerdas Cermat")
          .setDescription(board_text)
          .setFooter({ text: "Poin masuk ke papan peringkat: /trivia papan" }),
      ],
    })
    .catch(() => undefined);

  const results: PlayerResult[] = ranking.map(([userId, pts]) => ({
    userId,
    points: pts,
    correct: board.correct.get(userId) ?? 0,
    bestStreak: board.bestStreak.get(userId) ?? 0,
  }));
  await persistQuizResults(guildId, results).catch(() => undefined);

  // Juara kuis menyumbang poin ke faksinya (jika ada) — Perang Faksi.
  const championId = ranking[0]![0];
  await addFactionContribution(guildId, championId, 10).catch(() => undefined);
  // Battle Pass: juara dapat Season XP + progres misi "kuis".
  await addSeasonXp(guildId, championId, 100).catch(() => undefined);
  await trackSeasonMission(guildId, championId, "kuis", 1).catch(() => undefined);
}

async function stopGame(interaction: ChatInputCommandInteraction): Promise<void> {
  const channelId = interaction.channelId;
  const controller = activeSessions.get(channelId);
  if (!controller) {
    await interaction.reply({
      embeds: [errorEmbed("Tidak ada kuis yang berjalan di channel ini.")],
      ephemeral: true,
    });
    return;
  }
  controller.stop = true;
  await interaction.reply({
    embeds: [buildEmbed("warning").setDescription("🛑 Kuis akan dihentikan setelah soal ini.")],
  });
}

async function showLeaderboard(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  const rows = await getQuizLeaderboard(interaction.guildId!, 10);

  if (rows.length === 0) {
    await interaction.editReply({
      embeds: [
        buildEmbed("info")
          .setTitle("🏆 Papan Peringkat Cerdas Cermat")
          .setDescription("Belum ada yang main. Mulai dengan `/trivia mulai`!"),
      ],
    });
    return;
  }

  const medals = ["🥇", "🥈", "🥉"];
  const text = rows
    .map((r, i) => {
      const medal = medals[i] ?? `**${i + 1}.**`;
      return `${medal} <@${r.userId}> — **${r.points}** poin _(${r.correctAnswers} benar · streak terbaik ${r.bestStreak} · ${r.gamesPlayed} main)_`;
    })
    .join("\n");

  await interaction.editReply({
    embeds: [
      buildEmbed("premium").setTitle("🏆 Papan Peringkat Cerdas Cermat").setDescription(text),
    ],
  });
}

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("trivia")
    .setDescription("Cerdas Cermat: kuis langsung ramai-ramai yang dibuat AI.")
    .addSubcommand((s) =>
      s
        .setName("mulai")
        .setDescription("Mulai sesi Cerdas Cermat di channel ini.")
        .addStringOption((o) =>
          o
            .setName("topik")
            .setDescription("Tema soal (mis. sejarah, sepak bola, sains). Kosongkan untuk umum."),
        )
        .addStringOption((o) =>
          o
            .setName("tingkat")
            .setDescription("Tingkat kesulitan.")
            .addChoices(
              { name: "😌 Mudah", value: "mudah" },
              { name: "🙂 Sedang", value: "sedang" },
              { name: "🔥 Sulit", value: "sulit" },
            ),
        )
        .addIntegerOption((o) =>
          o
            .setName("jumlah")
            .setDescription("Jumlah soal (3-10, default 5).")
            .setMinValue(3)
            .setMaxValue(10),
        ),
    )
    .addSubcommand((s) =>
      s.setName("stop").setDescription("Hentikan kuis yang sedang berjalan di channel ini."),
    )
    .addSubcommand((s) =>
      s.setName("papan").setDescription("Lihat papan peringkat Cerdas Cermat server."),
    ),
  category: "fun",
  cooldownSeconds: 5,
  execute: async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [errorEmbed("Perintah ini hanya untuk di dalam server.")],
        ephemeral: true,
      });
      return;
    }

    const sub = interaction.options.getSubcommand();
    if (sub === "mulai") {
      // Host butuh izin kirim pesan; batasi ke member yang bisa mengirim di channel.
      const perms = interaction.memberPermissions;
      if (perms && !perms.has(PermissionFlagsBits.SendMessages)) {
        await interaction.reply({
          embeds: [errorEmbed("Kamu tidak punya izin mengirim pesan di sini.")],
          ephemeral: true,
        });
        return;
      }
      await startGame(interaction);
    } else if (sub === "stop") {
      await stopGame(interaction);
    } else {
      await showLeaderboard(interaction);
    }
  },
};

export default command;
