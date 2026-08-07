import { REVIEW_HEADERS, SHEET_NAMES, STATUS_HEADERS, SUMMARY_HEADERS } from "./excelLayout";
import type { CalculatedExecutionRow, ExecutionWorkbook } from "./types";

export type SupplementaryExcelModel = {
  sheetNames: typeof SHEET_NAMES;
  original: { rows: unknown[][] };
  review: { headers: string[]; rows: unknown[][]; total: unknown[]; overview: unknown[][] };
  status: { headers: string[]; rows: unknown[][]; total: unknown[] };
  summary: { headers: string[]; rows: unknown[][]; total: unknown[] };
};

const details = (row: CalculatedExecutionRow) => [
  row.policy,
  row.unitBusiness,
  row.detailBusiness,
  row.detailItem,
  row.account,
  row.subAccount,
  row.costCategory,
  row.description,
];

const totals = (rows: CalculatedExecutionRow[]) => rows.reduce((sum, row) => ({
  budget: sum.budget + row.budgetAmount,
  committed: sum.committed + row.committedAmount,
  paid: sum.paid + row.paidAmount,
  balance: sum.balance + row.balance,
  discrepancy: sum.discrepancy + row.discrepancy,
  planned: sum.planned + row.plannedAmount,
  available: sum.available + row.availableSupplement,
  proposal: sum.proposal + row.supplementProposal,
}), { budget: 0, committed: 0, paid: 0, balance: 0, discrepancy: 0, planned: 0, available: 0, proposal: 0 });

export function createSupplementaryExcelModel(
  source: ExecutionWorkbook,
  rows: CalculatedExecutionRow[],
): SupplementaryExcelModel {
  const total = totals(rows);
  const businessTotal = totals(rows.filter(row => row.costCategory === "일반업무추진비"));
  const rate = total.budget === 0 ? 0 : total.committed / total.budget;

  const groups = new Map<string, { policy: string; unit: string; detail: string; budget: number; committed: number }>();
  rows.forEach(row => {
    const key = `${row.policy}\u0000${row.unitBusiness}\u0000${row.detailBusiness}`;
    const group = groups.get(key) ?? {
      policy: row.policy,
      unit: row.unitBusiness,
      detail: row.detailBusiness,
      budget: 0,
      committed: 0,
    };
    group.budget += row.budgetAmount;
    group.committed += row.committedAmount;
    groups.set(key, group);
  });

  return {
    sheetNames: SHEET_NAMES,
    original: { rows: source.originalRows },
    review: {
      headers: REVIEW_HEADERS,
      rows: rows.map(row => [
        ...details(row), row.budgetAmount, row.committedAmount, row.paidAmount,
        row.balance, row.plannedAmount, row.availableSupplement, row.supplementProposal,
      ]),
      total: ["총합계", null, null, null, null, null, null, null, total.budget, total.committed, total.paid, total.balance, total.planned, total.available, total.proposal],
      overview: [
        ["전체", total.budget, total.committed, total.paid, total.balance, total.proposal],
        ["일반업무추진비", businessTotal.budget, businessTotal.committed, businessTotal.paid, businessTotal.balance, businessTotal.proposal],
      ],
    },
    status: {
      headers: STATUS_HEADERS,
      rows: rows.map(row => [
        ...details(row), row.budgetAmount, row.committedAmount, row.paidAmount,
        row.balance, row.discrepancy, row.executionRate / 100, row.supplementProposal,
      ]),
      total: ["총합계", null, null, null, null, null, null, null, total.budget, total.committed, total.paid, total.balance, total.discrepancy, rate, total.proposal],
    },
    summary: {
      headers: SUMMARY_HEADERS,
      rows: [...groups.values()].map(group => [
        group.policy, group.unit, group.detail, group.budget, group.committed,
        group.budget === 0 ? 0 : group.committed / group.budget,
      ]),
      total: ["총합계", null, null, total.budget, total.committed, rate],
    },
  };
}

