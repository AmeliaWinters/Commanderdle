import { useSyncExternalStore } from "react";

export interface Currency {
  code: string;
  symbol: string;
  rate: number;
  decimals: number;
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

export function getCurrency(): Currency {
  return current;
}

export function setCurrency(code: string): void {
  const next = byCode(code);
  if (next.code === current.code) return;
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, next.code);
  } catch {
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useCurrency(): Currency {
  return useSyncExternalStore(subscribe, getCurrency, getCurrency);
}

export function fromUsd(usd: number): number {
  return usd * current.rate;
}

export function toUsd(amount: number): number {
  return amount / current.rate;
}

export function formatMoney(usd: number): string {
  const c = current;
  const amount = fromUsd(usd).toFixed(c.decimals);
  return c.position === "after" ? `${amount} ${c.symbol}` : `${c.symbol}${amount}`;
}
