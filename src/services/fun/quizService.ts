import { QuizStat } from "../../database/models/QuizStat";
import { requestAiCompletion } from "../ai/openRouterClient";
import { logger } from "../logger.service";

export { scoreAnswer } from "./quizScoring";

export interface QuizQuestion {
  question: string;
  options: string[]; // tepat 4 opsi
  correctIndex: number; // 0-3
}

export type QuizDifficulty = "mudah" | "sedang" | "sulit";

const DIFFICULTY_LABEL: Record<QuizDifficulty, string> = {
  mudah: "mudah (pengetahuan umum dasar)",
  sedang: "sedang (perlu sedikit berpikir)",
  sulit: "sulit (menantang, untuk yang jago)",
};

// Bank soal cadangan kalau AI tidak aktif / gagal. Sengaja bertema Indonesia
// & pengetahuan umum agar cocok untuk komunitas publik lokal.
const FALLBACK_QUESTIONS: QuizQuestion[] = [
  {
    question: "Ibu kota Indonesia adalah?",
    options: ["Bandung", "Jakarta", "Surabaya", "Medan"],
    correctIndex: 1,
  },
  {
    question: "Berapa jumlah provinsi di Indonesia per 2024?",
    options: ["34", "35", "38", "40"],
    correctIndex: 2,
  },
  {
    question: "Siapa presiden pertama Indonesia?",
    options: ["Soeharto", "Habibie", "Soekarno", "Jokowi"],
    correctIndex: 2,
  },
  {
    question: "Planet terbesar di tata surya adalah?",
    options: ["Bumi", "Saturnus", "Jupiter", "Mars"],
    correctIndex: 2,
  },
  { question: "Hasil dari 7 x 8 adalah?", options: ["54", "56", "58", "64"], correctIndex: 1 },
  {
    question: "Lambang negara Indonesia adalah?",
    options: ["Garuda Pancasila", "Elang Jawa", "Merpati", "Rajawali"],
    correctIndex: 0,
  },
  {
    question: "Gunung tertinggi di Indonesia adalah?",
    options: ["Semeru", "Rinjani", "Puncak Jaya", "Kerinci"],
    correctIndex: 2,
  },
  {
    question: "Air mendidih pada suhu berapa (°C) di permukaan laut?",
    options: ["90", "100", "110", "80"],
    correctIndex: 1,
  },
  {
    question: "Mata uang negara Jepang adalah?",
    options: ["Won", "Yuan", "Yen", "Ringgit"],
    correctIndex: 2,
  },
  {
    question: "Hewan yang dikenal sebagai 'raja hutan' adalah?",
    options: ["Harimau", "Singa", "Gajah", "Serigala"],
    correctIndex: 1,
  },
  {
    question: "Alat untuk mengukur suhu disebut?",
    options: ["Barometer", "Termometer", "Higrometer", "Speedometer"],
    correctIndex: 1,
  },
  {
    question: "Danau terbesar di Indonesia adalah?",
    options: ["Danau Toba", "Danau Sentani", "Danau Maninjau", "Danau Poso"],
    correctIndex: 0,
  },
];

function shuffle<T>(array: readonly T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/** Ambil `count` soal cadangan acak (opsi tetap diacak posisinya). */
function fallbackQuestions(count: number): QuizQuestion[] {
  return shuffle(FALLBACK_QUESTIONS)
    .slice(0, count)
    .map((q) => {
      const correct = q.options[q.correctIndex]!;
      const options = shuffle(q.options);
      return { question: q.question, options, correctIndex: options.indexOf(correct) };
    });
}

/** Validasi & rapikan satu soal hasil AI. Kembalikan null bila tidak valid. */
function sanitizeQuestion(raw: unknown): QuizQuestion | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as Record<string, unknown>;
  const question = typeof record.question === "string" ? record.question.trim() : "";
  const options = Array.isArray(record.options)
    ? record.options.map((o) => String(o).trim()).filter(Boolean)
    : [];
  const correctIndex = Number(record.correctIndex);

  if (!question || options.length !== 4) return null;
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) return null;

  return {
    question: question.slice(0, 240),
    options: options.map((o) => o.slice(0, 80)),
    correctIndex,
  };
}

/**
 * Buat daftar soal kuis. Utamakan AI (soal Bahasa Indonesia sesuai topik &
 * tingkat kesulitan). Jika AI mati atau outputnya rusak, pakai bank cadangan
 * supaya game tetap jalan.
 */
export async function generateQuizQuestions(
  topic: string,
  difficulty: QuizDifficulty,
  count: number,
): Promise<QuizQuestion[]> {
  const jumlah = Math.min(10, Math.max(1, count));

  const systemPrompt =
    "Kamu pembuat soal kuis 'Cerdas Cermat' untuk komunitas Discord Indonesia. " +
    "Tugasmu membuat soal pilihan ganda dalam Bahasa Indonesia yang jelas, akurat, dan tidak ambigu. " +
    "Balas HANYA dengan JSON array valid, tanpa penjelasan atau teks lain, tanpa blok kode markdown. " +
    'Format tiap elemen: {"question": string, "options": [string, string, string, string], "correctIndex": number(0-3)}. ' +
    "Tepat 4 opsi per soal dan hanya 1 jawaban benar.";

  const userPrompt =
    `Buat ${jumlah} soal kuis dengan topik "${topic || "pengetahuan umum"}" ` +
    `tingkat kesulitan ${DIFFICULTY_LABEL[difficulty]}. ` +
    "Pastikan jawaban benar-benar tepat secara fakta. Balas hanya JSON array.";

  try {
    const ai = await requestAiCompletion(systemPrompt, userPrompt);
    if (ai.ok && ai.content) {
      const parsed = parseQuestions(ai.content);
      if (parsed.length > 0) return parsed.slice(0, jumlah);
    }
  } catch (error) {
    logger.warn("Gagal membuat soal kuis via AI", {
      error: error instanceof Error ? error.message : error,
    });
  }

  return fallbackQuestions(jumlah);
}

/** Ekstrak JSON array dari respons AI (toleran terhadap ```json``` & teks liar). */
function parseQuestions(content: string): QuizQuestion[] {
  const start = content.indexOf("[");
  const end = content.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];

  let data: unknown;
  try {
    data = JSON.parse(content.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  const questions: QuizQuestion[] = [];
  for (const raw of data) {
    const clean = sanitizeQuestion(raw);
    if (clean) questions.push(clean);
  }
  return questions;
}

export interface PlayerResult {
  userId: string;
  points: number;
  correct: number;
  bestStreak: number;
}

/** Simpan hasil satu sesi kuis ke statistik all-time tiap pemain. */
export async function persistQuizResults(guildId: string, results: PlayerResult[]): Promise<void> {
  await Promise.all(
    results.map((r) =>
      QuizStat.findOneAndUpdate(
        { guildId, userId: r.userId },
        {
          $inc: { points: r.points, correctAnswers: r.correct, gamesPlayed: 1 },
          $max: { bestStreak: r.bestStreak },
        },
        { upsert: true },
      ).catch((error) =>
        logger.warn("Gagal menyimpan statistik kuis", {
          guildId,
          userId: r.userId,
          error: error instanceof Error ? error.message : error,
        }),
      ),
    ),
  );
}

export function getQuizLeaderboard(guildId: string, limit = 10) {
  return QuizStat.find({ guildId }).sort({ points: -1 }).limit(limit);
}
