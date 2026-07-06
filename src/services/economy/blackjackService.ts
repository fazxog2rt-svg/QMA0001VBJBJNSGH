import { buildEmbed } from "../../utils/embed";

interface Card {
  rank: string;
  suit: string;
}

export interface BlackjackGame {
  guildId: string;
  userId: string;
  bet: number;
  deck: Card[];
  player: Card[];
  dealer: Card[];
  finished: boolean;
}

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const games = new Map<string, BlackjackGame>();
const key = (guildId: string, userId: string) => `${guildId}:${userId}`;

function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ rank, suit });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  return deck;
}

function cardValue(rank: string): number {
  if (rank === "A") return 11;
  if (["K", "Q", "J"].includes(rank)) return 10;
  return Number(rank);
}

export function handValue(cards: Card[]): number {
  let total = cards.reduce((sum, c) => sum + cardValue(c.rank), 0);
  let aces = cards.filter((c) => c.rank === "A").length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handValue(cards) === 21;
}

export function renderHand(cards: Card[], hideSecond = false): string {
  return cards.map((c, i) => (hideSecond && i === 1 ? "🂠" : `${c.rank}${c.suit}`)).join(" ");
}

export function getGame(guildId: string, userId: string): BlackjackGame | undefined {
  return games.get(key(guildId, userId));
}

export function startGame(guildId: string, userId: string, bet: number): BlackjackGame {
  const deck = buildDeck();
  const player = [deck.pop()!, deck.pop()!];
  const dealer = [deck.pop()!, deck.pop()!];
  const game: BlackjackGame = { guildId, userId, bet, deck, player, dealer, finished: false };
  games.set(key(guildId, userId), game);
  return game;
}

export function hit(game: BlackjackGame): void {
  game.player.push(game.deck.pop()!);
  if (handValue(game.player) >= 21) game.finished = true;
}

/** Dealer menarik kartu sampai minimal 17. */
export function dealerPlay(game: BlackjackGame): void {
  while (handValue(game.dealer) < 17) {
    game.dealer.push(game.deck.pop()!);
  }
  game.finished = true;
}

export type BlackjackOutcome = "menang" | "kalah" | "seri" | "blackjack";

export function resolve(game: BlackjackGame): BlackjackOutcome {
  const p = handValue(game.player);
  const d = handValue(game.dealer);
  if (p > 21) return "kalah";
  if (isBlackjack(game.player) && !isBlackjack(game.dealer)) return "blackjack";
  if (d > 21) return "menang";
  if (p > d) return "menang";
  if (p < d) return "kalah";
  return "seri";
}

export function endGame(guildId: string, userId: string): void {
  games.delete(key(guildId, userId));
}

/** Jumlah koin yang dikreditkan ke pemain (taruhan sudah dipotong di awal). */
export function payoutAmount(outcome: BlackjackOutcome, bet: number): number {
  switch (outcome) {
    case "blackjack":
      return Math.floor(bet * 2.5);
    case "menang":
      return bet * 2;
    case "seri":
      return bet;
    default:
      return 0;
  }
}

export function buildBlackjackEmbed(game: BlackjackGame, symbol: string, reveal: boolean) {
  const playerVal = handValue(game.player);
  const dealerVal = reveal ? handValue(game.dealer) : cardValue(game.dealer[0]!.rank);

  const embed = buildEmbed(reveal ? "primary" : "warning")
    .setTitle("🃏 Blackjack")
    .addFields(
      { name: `Kamu (${playerVal})`, value: renderHand(game.player) },
      {
        name: reveal ? `Dealer (${handValue(game.dealer)})` : `Dealer (${dealerVal}+?)`,
        value: renderHand(game.dealer, !reveal),
      },
    )
    .setFooter({ text: `Taruhan: ${symbol} ${game.bet.toLocaleString("id-ID")}` });

  if (!reveal) {
    embed.setDescription("Tekan **Hit** untuk ambil kartu, atau **Stand** untuk berhenti.");
  }
  return embed;
}
