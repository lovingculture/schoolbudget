import type { ClosingSource, ValidationResult } from "./types";

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const compare = (
  id: string,
  label: string,
  expected: number,
  actual: number,
): ValidationResult => ({ id, label, expected, actual, ok: expected === actual });

export function validateClosing(source: ClosingSource): ValidationResult[] {
  return [
    compare(
      "surplus",
      "세입결산액 - 세출결산액 = 세계잉여금",
      source.incomeTotal - source.expenseTotal,
      source.surplus,
    ),
    compare(
      "income",
      "세입 결산내역 합계 = 세입결산액",
      sum(source.incomeRows.map(row => row.amount)),
      source.incomeTotal,
    ),
    compare(
      "expense",
      "세출 결산내역 합계 = 세출결산액",
      sum(source.expenseRows.map(row => row.amount)),
      source.expenseTotal,
    ),
    compare(
      "surplus-use",
      "이월·반환·순세계잉여금 합계 = 세계잉여금",
      source.carryovers.specified +
        source.carryovers.accident +
        source.carryovers.continuing +
        source.subsidyReturn +
        source.netSurplus,
      source.surplus,
    ),
  ];
}
