import type { CalculatedExecutionRow, ExecutionRow, UnitBusinessSummary } from "./types";

export function calculateExecutionRow(
  row: ExecutionRow,
  plannedAmount = 0,
  supplementProposal = 0,
): CalculatedExecutionRow {
  const balance = row.budgetAmount - row.committedAmount;
  return {
    ...row,
    balance,
    discrepancy: row.committedAmount - row.paidAmount,
    executionRate: row.budgetAmount === 0 ? 0 : row.committedAmount / row.budgetAmount * 100,
    plannedAmount,
    availableSupplement: balance - plannedAmount,
    supplementProposal,
  };
}

export function aggregateByUnitBusiness(rows: CalculatedExecutionRow[]): UnitBusinessSummary[] {
  const groups = new Map<string, UnitBusinessSummary>();
  rows.forEach(row => {
    const key = `${row.policy}\u0000${row.unitBusiness}`;
    const group = groups.get(key) ?? {
      policy: row.policy, unitBusiness: row.unitBusiness, budgetAmount: 0,
      committedAmount: 0, paidAmount: 0, balance: 0, executionRate: 0,
    };
    group.budgetAmount += row.budgetAmount;
    group.committedAmount += row.committedAmount;
    group.paidAmount += row.paidAmount;
    group.balance += row.balance;
    group.executionRate = group.budgetAmount === 0 ? 0 : group.committedAmount / group.budgetAmount * 100;
    groups.set(key, group);
  });
  return [...groups.values()];
}
