import type { FoundationExpenseRow, FoundationRevenueRow } from "./types";

export interface RevenueCalculationLine {
  basis: string;
  amount: number;
}

function amountFromBasis(basis: string): number | null {
  const expression = (basis.split(":", 2)[1] ?? basis).split("=", 1)[0];
  const factors = [...expression.matchAll(/\d[\d,]*(?:\.\d+)?/g)]
    .map((match) => Number(match[0].replace(/,/g, "")))
    .filter(Number.isFinite);
  if (!factors.length) return null;
  const amount = expression.includes("*") ? factors.reduce((total, factor) => total * factor, 1) : factors[0];
  return Math.round(amount / 1_000) * 1_000;
}

export function revenueCalculationLines(row: FoundationRevenueRow | FoundationExpenseRow): RevenueCalculationLine[] {
  const bases = row.calculationBasis.split(/\r?\n/).map((basis) => basis.trim()).filter(Boolean);
  if (!bases.length) return [{ basis: "", amount: row.priorAmount * 1_000 }];
  return bases.map((basis, index) => ({
    basis,
    amount: amountFromBasis(basis) ?? (bases.length === 1 || index === 0 ? row.priorAmount * 1_000 : 0),
  }));
}
