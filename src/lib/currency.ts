import { useSyncExternalStore } from "react";

/**
 * Display-currency preference. Card prices in the data are stored in USD (the
 * Scryfall/Cardmarket source figure); this module converts that single USD
 * figure into the player's chosen currency for display in the classic table and
 * in Guess the cost.
 *
 * Rates are static approximations baked into the bundle — this is a front-end
 * only app with no live FX feed, and MTG prices are themselves ballpark, so an
 * exact rate buys nothing. The preference lives in localStorage so it applies to
 * everyone (guests included) and is surfaced in account settings.
 */
export interface Currency {
  code: string;
  symbol: string;
  /** Approximate units of this currency per 1 USD. */
  rate: number;
  /** Fraction digits shown (0 for yen-style currencies). */
  decimals: number;
  /** Where the symbol sits relative to the amount: "$5" vs "5 zł". */
  position: "before" | "after";
}

export const CURRENCIES: readonly Currency[] = [
  { code: "USD", symbol: "$", rate: 1, decimals: 2, position: "before" },
  { code: "EUR", symbol: "€", rate: 0.92, decimals: 2, position: "before" },
  { code: "GBP", symbol: "£", rate: 0.79, decimals: 2, position: "before" },
  { code: "CAD", symbol: "CA$", rate: 1.37, decimals: 2, position: "before" },
  { code: "AUD", symbol: "A$", rate: 1.52, decimals: 2, position: "before" },
  { code: "JPY", symbol: "¥", rate: 156, decimals: 0, position: "before" },
  { code: "BRL", symbol: "R$", rate: 5.5, decimals: 2, position: "before" },
  { code: "MXN", symbol: "MX$", rate: 18, decimals: 2, position: "before" },
  { code: "INR", symbol: "₹", rate: 84, decimals: 2, position: "before" },
  { code: "PLN", symbol: "zł", rate: 3.95, decimals: 2, position: "after" },
];

const DEFAULT = CURRENCIES[0];
const STORAGE_KEY = "commandle:currency";

function byCode(code: string | null): Currency {
  return CURRENCIES.find((c) => c.code === code) ?? DEFAULT;
}

let current: Currency = (() => {
  try {
    return byCode(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT;
  }
})();

const listeners = new Set<() => void>();

/** The player's currently chosen display currency. */
export function getCurrency(): Currency {
  return current;
}

/** Set the display currency by code and notify subscribers. No-op if unknown. */
export function setCurrency(code: string): void {
  const next = byCode(code);
  if (next.code === current.code) return;
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, next.code);
  } catch {
    /* storage disabled — the in-memory choice still applies this session */
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Re-render on currency change; returns the current currency. */
export function useCurrency(): Currency {
  return useSyncExternalStore(subscribe, getCurrency, getCurrency);
}

/** Convert a USD amount into the current currency. */
export function fromUsd(usd: number): number {
  return usd * current.rate;
}

/** Convert an amount typed in the current currency back into USD. */
export function toUsd(amount: number): number {
  return amount / current.rate;
}

/** Format a USD amount in the current currency, e.g. 3.45 -> "€3.17" / "13.62 zł". */
export function formatMoney(usd: number): string {
  const c = current;
  const amount = fromUsd(usd).toFixed(c.decimals);
  return c.position === "after" ? `${amount} ${c.symbol}` : `${c.symbol}${amount}`;
}
