import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  SlashCommandBuilder,
} from "discord.js";
import type { SlashCommand } from "../../types/command";
import { buildEmbed, errorEmbed } from "../../utils/embed";
import { logger } from "../../services/logger.service";

interface TriviaApiResponse {
  results?: {
    question: string;
    correct_answer: string;
    incorrect_answers: string[];
  }[];
}

function decodeHtmlEntities(text: string): string {
  return text
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&eacute;", "é")
    .replaceAll("&ldquo;", '"')
    .replaceAll("&rdquo;", '"');
}

function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

const command: SlashCommand = {
  data: new SlashCommandBuilder().setName("trivia").setDescription("Main kuis trivia."),
  category: "fun",
  cooldownSeconds: 8,
  execute: async (interaction) => {
    await interaction.deferReply();

    let question: string;
    let correctAnswer: string;
    let answers: string[];

    try {
      const response = await fetch("https://opentdb.com/api.php?amount=1&type=multiple");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = (await response.json()) as TriviaApiResponse;
      const result = data.results?.[0];
      if (!result) throw new Error("No trivia result");

      question = decodeHtmlEntities(result.question);
      correctAnswer = decodeHtmlEntities(result.correct_answer);
      answers = shuffle([correctAnswer, ...result.incorrect_answers.map(decodeHtmlEntities)]);
    } catch (error) {
      logger.warn("Gagal mengambil trivia", {
        error: error instanceof Error ? error.message : error,
      });
      await interaction.editReply({
        embeds: [errorEmbed("Gagal mengambil soal trivia. Coba lagi nanti.")],
      });
      return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      answers.map((answer, index) =>
        new ButtonBuilder()
          .setCustomId(`trivia-answer:${index}`)
          .setLabel(answer.slice(0, 80))
          .setStyle(ButtonStyle.Secondary),
      ),
    );

    const message = await interaction.editReply({
      embeds: [
        buildEmbed("primary")
          .setTitle("🧠 Trivia")
          .setDescription(question)
          .setFooter({ text: "Kamu punya 20 detik!" }),
      ],
      components: [row],
    });

    try {
      const buttonInteraction = await message.awaitMessageComponent({
        componentType: ComponentType.Button,
        time: 20_000,
        filter: (i) => i.user.id === interaction.user.id,
      });

      const chosenIndex = Number(buttonInteraction.customId.split(":")[1]);
      const isCorrect = answers[chosenIndex] === correctAnswer;

      await buttonInteraction.update({
        embeds: [
          isCorrect
            ? buildEmbed("success")
                .setTitle("✅ Benar!")
                .setDescription(`Jawaban: **${correctAnswer}**`)
            : buildEmbed("danger")
                .setTitle("❌ Salah!")
                .setDescription(`Jawaban yang benar: **${correctAnswer}**`),
        ],
        components: [],
      });
    } catch {
      await interaction.editReply({
        embeds: [
          buildEmbed("warning")
            .setTitle("⏱️ Waktu Habis")
            .setDescription(`Jawaban yang benar: **${correctAnswer}**`),
        ],
        components: [],
      });
    }
  },
};

export default command;
