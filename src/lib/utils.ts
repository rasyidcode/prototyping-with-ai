import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Language } from "@/context/LanguageContext";

export const EXCHANGE_RATE_USD_IDR = 16000;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency based on language. 
// Base amount is assumed to be in IDR.
export function formatCurrency(amount: number, language: Language = "id"): string {
  if (language === "id") {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  }
  
  // Convert IDR to USD
  const convertedAmount = amount / EXCHANGE_RATE_USD_IDR;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(convertedAmount);
}
