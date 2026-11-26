// Shared shapes for questions, settings, players and saved matches.
export type Tier = "easy" | "medium" | "hard";
export type CompanionKind = "lion" | "ox" | "eagle" | "human";
export type MatchMode = "friends" | "random" | "daily";
export type Random = () => number;

export interface Category {
  id: string;
  name: string;
  short: string;
  color: string;
  pale: string;
  ink: string;
  icon: string;
  description: string;
  detail: string;
}

export interface Question {
  id: string;
  category: string;
  difficulty: string;
  text: string;
  answers: string[];
  correct: number;
  explanation: string;
  source?: string;
}

export interface Settings {
  timed: boolean;
  seconds: number;
  tier: Tier;
  rounds: number;
  questions: number;
  category: string | null;
  combo: boolean;
  length: "quick" | "full";
  plan: string[] | null;
  daily: string | null;
}

export interface Player {
  name: string;
  isBot: boolean;
  kind: CompanionKind;
  score: number;
  correct: number;
  streak: number;
  bestStreak: number;
  badges: string[];
}

export interface ClassicPlayer extends Player {
  won: string[];
  meter: number;
  helps: number;
}

// A pick waiting for the reveal carries msLeft; a revealed answer carries its score.
export interface AnswerEntry {
  choice: number;
  msLeft?: number;
  points?: number;
  correct?: boolean;
  streak?: number;
  challenge?: boolean;
}

export type Phase =
  "spin" | "question" | "reveal" | "handoff" | "standings" | "finished";

export interface Game {
  structure: "turns" | "simultaneous";
  settings: Settings;
  players: Player[];
  turn: number;
  used: string[];
  phase: Phase;
  question: Question | null;
  selected: number | null;
  answers: Record<number, AnswerEntry>;
}

export type ClassicPhase =
  "spin" | "question" | "reveal" | "pick" | "handoff" | "rival" | "finished";

export interface RivalStep {
  category: string;
  correct: boolean;
  challenge: boolean;
}

export interface ClassicGame {
  structure: "classic";
  settings: Settings;
  players: ClassicPlayer[];
  turn: number;
  round: number;
  phase: ClassicPhase;
  question: Question | null;
  challenge: string | null;
  hidden: number[];
  used: string[];
  answers: Record<number, AnswerEntry>;
  selected: number | null;
  rival: { player: number; steps: RivalStep[] } | null;
}

export type AnyGame = Game | ClassicGame;

export interface SavedMatch {
  mode: MatchMode;
  game: AnyGame;
}

// Progress at the start of a match, so results can show what it earned.
export interface MatchMeta {
  xpStart: number;
  badgesStart: string[];
  categoryStart: Record<string, number>;
  dailyOutcome?: { usedFreeze: boolean; earnedFreeze: boolean };
}

// The question clock App owns and hands to the play screens.
export interface QuestionClock {
  running: boolean;
  key: string | null;
  msLeft: () => number;
  elapsed: () => number;
}

export interface DailyResult {
  correct: number;
  total: number;
  score: number;
}

export interface Stats {
  version: number;
  games: number;
  wins: number;
  correct: number;
  badges: string[];
  xp: number;
  bestStreak: number;
  categoryCorrect: Record<string, number>;
  daily: {
    lastDate: string | null;
    streak: number;
    best: number;
    freezes: number;
    results: Record<string, DailyResult>;
  };
}
