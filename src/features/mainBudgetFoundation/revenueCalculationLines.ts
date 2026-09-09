import type { FoundationRevenueRow } from "./types";

export interface RevenueCalculationLine {
  basis: string;
  amount: number;
}

function amountFromBasis(basis: string): number | null {
  const matches = [...basis.matchAll(/\d[\d,]*(?:\.\d+)?/g)]
    .map((match) => match[0])
    .filter((value) => value.includes(",") || Number(value.replace(/,/g, "")) >= 1_000);
  if (!matches.length) return null;
  const amount = Number(matches.at(-1)!.replace(/,/g, ""));
  return Number.isFinite(amount) ? amount : null;
}

export function revenueCalculationLines(row: FoundationRevenueRow): RevenueCalculationLine[] {
  const bases = row.calculationBasis.split(/\r?\n/).map((basis) => basis.trim()).filter(Boolean);
  if (!bases.length) return [{ basis: "", amount: row.priorAmount * 1_000 }];
  return bases.map((basis, index) => ({
    basis,
    amount: amountFromBasis(basis) ?? (bases.length === 1 || index === 0 ? row.priorAmount * 1_000 : 0),
  }));
}
