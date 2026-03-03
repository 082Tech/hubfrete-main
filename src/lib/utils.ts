import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata peso em kg para exibição.
 * - Se >= 1000 kg, mostra em toneladas com até 4 casas decimais significativas.
 * - Se < 1000 kg, mostra em kg com até 4 casas decimais.
 * Remove zeros desnecessários à direita.
 */
export function formatWeight(kg: number | null | undefined): string {
  if (kg == null || kg === 0) return '-';
  if (kg >= 1000) {
    const tons = kg / 1000;
    // Remove trailing zeros
    return `${parseFloat(tons.toFixed(4))}t`;
  }
  return `${parseFloat(kg.toFixed(4))}kg`;
}

/**
 * Converte input de peso (string com vírgula ou ponto) para number.
 * Aceita: "1.500,2345" ou "1500.2345"
 * Retorna o valor numérico ou 0.
 */
export function parseWeightInput(value: string): number {
  if (!value) return 0;
  // Se contém vírgula, trata como separador decimal BR
  let cleaned = value;
  if (cleaned.includes(',')) {
    // Remove pontos de milhar e troca vírgula por ponto
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.max(0, parseFloat(num.toFixed(4)));
}

/**
 * Formata um número para exibição no input de peso (formato BR com vírgula).
 */
export function formatWeightInput(value: number | null | undefined): string {
  if (value == null || value === 0) return '';
  // Formata com até 4 casas decimais, remove zeros à direita
  const formatted = parseFloat(value.toFixed(4)).toString();
  return formatted.replace('.', ',');
}
