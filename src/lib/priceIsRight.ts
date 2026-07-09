import type { Commander } from "../types/commander";
import { COMMANDERS } from "./commanders";
import { todayKey, hashString } from "./dailyAnswer";
import { formatMoney, toUsd } from "./currency";

export const PIR_MAX_GUESSES = 6;

export const PIR_WIN_RATIO = 0.05;
export const PIR_WIN_ABS = 0.1;

const HOT_RATIO = 0.15;
const WARM_RATIO = 0.3;

export type PirHeat = "win" | "hot" | "warm" | "cold";

export interface PirFeedback {
  guess: number;
  heat: PirHeat;
  dir: "higher" | "lower" | null;
}

export function judgePrice(guess: number, price: number): PirFeedback {
  const diff = Math.abs(guess - price);
  if (diff <= PIR_WIN_ABS || diff / price <= PIR_WIN_RATIO)
    return { guess, heat: "win", dir: null };
  const heat =
    diff / price <= HOT_RATIO
      ? "hot"
      : diff / price <= WARM_RATIO
        ? "warm"
        : "cold";
  return { guess, heat, dir: price > guess ? "higher" : "lower" };
}

export function pricePool(): Commander[] {
  return COMMANDERS.filter((c) => c.price != null && c.normalImage);
}

export function dailyPriceCard(dateKey = todayKey()): Commander {
  const pool = pricePool();
  return pool[hashString(`guess-the-cost:${dateKey}`) % pool.length];
}

export function randomPriceCard(exclude?: ReadonlySet<string>): Commander {
  let pool = pricePool();
  if (exclude?.size) {
    const filtered = pool.filter((c) => !exclude.has(c.name));
    if (filtered.length > 0) pool = filtered;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

export function formatPrice(value: number): string {
  return formatMoney(value);
}

export function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,-]/g, "").replace(",", ".");
  if (!/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function parsePriceUsd(raw: string): number | null {
  const value = parsePrice(raw);
  return value == null ? null : toUsd(value);
}
