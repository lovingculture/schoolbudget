import {
  EXPENSE_LEVELS,
  INCOME_LEVELS,
  type BudgetDataset,
  type BudgetNode,
  type BudgetSummary,
  type ExpenseAnalysisMetric,
  type ExpenseAnalysisMetricId,
  type ExpenseRow,
  type IncomeRow,
  type IncomeStructureMetric,
  type IncomeStructureMetricId,
  type LinkedSchoolProfile,
  type MoneyUnit,
  type PublicUtilityCategory,
  type PublicUtilityMetric,
  type RigidExpenseCategory,
  type RigidExpenseGroupMetric,
  type RigidExpenseMetric,
  type RigidExpenseSummary,
  type SortKey,
  type SourceAmounts,
  type Won,
} from "./types";

export function won(value: number): Won {
  if (!Number.isSafeInteger(value)) {
    throw new Error("금액은 안전한 정수 원 단위여야 합니다.");
  }
  return value;
}

export function subtract(a: Won, b: Won): Won {
  return won(a - b);
}

export function rate(numerator: number, denominator: number): number | null {
  won(numerator);
  won(denominator);
  return denominator === 0 ? null : (numerator / denominator) * 100;
}

function scopeKey(row: SourceAmounts): string {
  return JSON.stringify([
    row.schoolCode,
    row.fiscalYear,
    row.referenceMonth,
    row.sourceBundleNumber,
  ]);
}

export function assertSingleScope(rows: readonly SourceAmounts[]): void {
  if (new Set(rows.map(scopeKey)).size > 1) {
    throw new Error("학교·기간·원문 묶음을 혼합할 수 없습니다.");
  }
}

export function selectBundle<T extends SourceAmounts>(
  rows: readonly T[],
  bundle: number,
): T[] {
  if (!Number.isSafeInteger(bundle) || bundle < 1) {
    throw new Error("올바르지 않은 원문 묶음");
  }
  const selected = rows.filter((row) => row.sourceBundleNumber === bundle);
  assertSingleScope(selected);
  return selected;
}

export function bundleNumbers(rows: readonly SourceAmounts[]): number[] {
  return [...new Set(rows.map((row) => row.sourceBundleNumber))].sort(
    (a, b) => a - b,
  );
}

export function sumSameLevel<T extends SourceAmounts & { rowType: string }>(
  rows: readonly T[],
): Won {
  assertSingleScope(rows);
  if (new Set(rows.map((row) => row.rowType)).size > 1) {
    throw new Error("서로 다른 계층을 함께 합산할 수 없습니다.");
  }
  if (new Set(rows.map((row) => row.sourceRowNumber)).size !== rows.length) {
    throw new Error("같은 원문 행을 중복 합산할 수 없습니다.");
  }
  return rows.reduce((sum, row) => won(sum + won(row.settlementAmount)), won(0));
}

export function getTotal<T extends SourceAmounts & { rowType: string }>(
  rows: readonly T[],
  bundle: number,
): T {
  const totals = selectBundle(rows, bundle).filter((row) => row.rowType === "합계");
  if (totals.length !== 1) {
    throw new Error("선택한 원문 묶음의 합계 행은 정확히 1개여야 합니다.");
  }
  return totals[0];
}

export function summaryMetrics(summary: BudgetSummary) {
  return {
    incomeSettlementRate:
      summary.currentBudget === null || summary.incomeSettlement === null
        ? null
        : rate(summary.incomeSettlement, summary.currentBudget),
    expenseExecutionRate:
      summary.currentBudget === null || summary.expenseSettlement === null
        ? null
        : rate(summary.expenseSettlement, summary.currentBudget),
    surplus:
      summary.incomeSettlement === null || summary.expenseSettlement === null
        ? null
        : subtract(summary.incomeSettlement, summary.expenseSettlement),
    incomeDifference:
      summary.currentBudget === null || summary.incomeSettlement === null
        ? null
        : subtract(summary.currentBudget, summary.incomeSettlement),
    expenseDifference:
      summary.currentBudget === null || summary.expenseSettlement === null
        ? null
        : subtract(summary.currentBudget, summary.expenseSettlement),
  };
}

export function getSummaryMetrics(dataset: BudgetDataset) {
  return summaryMetrics(dataset.summary);
}

export function nodeMetrics(row: SourceAmounts, total: Won) {
  return {
    currentBudget: row.currentBudget,
    settlementAmount: row.settlementAmount,
    difference: subtract(row.currentBudget, row.settlementAmount),
    sourceDifference: row.difference,
    settlementRate: rate(row.settlementAmount, row.currentBudget),
    share: rate(row.settlementAmount, total),
  };
}

function metricAmount(
  rows: readonly IncomeRow[],
  matches: (row: IncomeRow) => boolean,
): Won {
  const matched = rows.filter(matches);
  if (!matched.length) return won(0);
  if (matched.length !== 1) {
    throw new Error("세입 구조 분석 지표의 원문 행은 정확히 1개여야 합니다.");
  }
  return matched[0].settlementAmount;
}

export function incomeStructureMetrics(
  rows: readonly IncomeRow[],
  bundle: number,
): IncomeStructureMetric[] {
  const total = getTotal(rows, bundle);
  const scoped = selectBundle(rows, bundle);
  const totalIncome = total.settlementAmount;
  const definitions: Array<
    Omit<IncomeStructureMetric, "numerator" | "denominator" | "rate"> & {
      numerator: Won;
      denominator: Won;
    }
  > = [
    {
      id: "educationOfficeDependencyRate",
      label: "교육청 재원 의존도",
      numeratorLabel: "교육비특별회계전입금",
      numerator: metricAmount(
        scoped,
        (row) => row.rowType === "목상세" && row.item === "교육비특별회계전입금",
      ),
      denominatorLabel: "총 세입",
      denominator: totalIncome,
      formula: "교육비특별회계전입금 / 총 세입 × 100",
      description:
        "교육청에서 이전받은 교육비특별회계전입금이 전체 세입에서 차지하는 비중입니다.",
    },
    {
      id: "ownRevenueRate",
      label: "자체수입 비중",
      numeratorLabel: "자체수입",
      numerator: metricAmount(
        scoped,
        (row) => row.rowType === "장소계" && row.chapter === "자체수입",
      ),
      denominatorLabel: "총 세입",
      denominator: totalIncome,
      formula: "자체수입 / 총 세입 × 100",
      description:
        "학부모 부담수입과 행정활동수입 등 학교 자체적으로 확보한 수입의 비중입니다.",
    },
    {
      id: "parentBurdenRate",
      label: "학부모 부담수입 비중",
      numeratorLabel: "학부모부담수입",
      numerator: metricAmount(
        scoped,
        (row) => row.rowType === "관소계" && row.section === "학부모부담수입",
      ),
      denominatorLabel: "총 세입",
      denominator: totalIncome,
      formula: "학부모부담수입 / 총 세입 × 100",
      description:
        "급식비·방과후학교 활동비·현장체험학습비처럼 학부모 부담으로 조성된 수입의 비중입니다.",
    },
    {
      id: "localGovernmentTransferRate",
      label: "지방자치단체 이전수입 비중",
      numeratorLabel: "지방자치단체이전수입",
      numerator: metricAmount(
        scoped,
        (row) =>
          row.rowType === "관소계" && row.section === "지방자치단체이전수입",
      ),
      denominatorLabel: "총 세입",
      denominator: totalIncome,
      formula: "지방자치단체이전수입 / 총 세입 × 100",
      description:
        "기초·광역 지방자치단체에서 이전받은 교육경비보조금 등의 비중입니다.",
    },
    {
      id: "carryoverRate",
      label: "전년도 이월금 비중",
      numeratorLabel: "전년도이월금",
      numerator: metricAmount(
        scoped,
        (row) => row.rowType === "관소계" && row.section === "전년도이월금",
      ),
      denominatorLabel: "총 세입",
      denominator: totalIncome,
      formula: "전년도이월금 / 총 세입 × 100",
      description:
        "전년도 결산에서 이월된 순세계잉여금 등 이월 재원의 비중입니다.",
    },
    {
      id: "incomeSettlementRate",
      label: "세입결산률",
      numeratorLabel: "세입결산액",
      numerator: totalIncome,
      denominatorLabel: "세입 예산현액",
      denominator: total.currentBudget,
      formula: "세입결산액 / 세입 예산현액 × 100",
      description: "세입 예산현액 가운데 실제로 결산된 금액의 비율입니다.",
    },
  ];
  return definitions.map((definition) => ({
    ...definition,
    rate: rate(definition.numerator, definition.denominator),
  }));
}

export function getIncomeStructure(
  rows: readonly IncomeRow[],
  bundle: number,
): Record<IncomeStructureMetricId, IncomeStructureMetric> {
  return Object.fromEntries(
    incomeStructureMetrics(rows, bundle).map((metric) => [metric.id, metric]),
  ) as Record<IncomeStructureMetricId, IncomeStructureMetric>;
}

function expenseLeaves(rows: readonly ExpenseRow[], bundle: number): ExpenseRow[] {
  const scoped = selectBundle(rows, bundle);
  if (!scoped.length) {
    throw new Error("선택한 원문 묶음의 합계 행은 정확히 1개여야 합니다.");
  }
  return scoped.filter((row) => row.rowType === "세부항목상세");
}

function expenseTotal(rows: readonly ExpenseRow[], bundle: number): Won {
  const scoped = selectBundle(rows, bundle);
  const total = scoped.filter((row) => row.rowType === "합계");
  if (total.length === 1) return total[0].settlementAmount;
  if (total.length > 1) {
    throw new Error("선택한 원문 묶음의 합계 행은 정확히 1개여야 합니다.");
  }
  const leaves = expenseLeaves(rows, bundle);
  if (!leaves.length) {
    throw new Error("선택한 원문 묶음의 합계 행은 정확히 1개여야 합니다.");
  }
  return sumSameLevel(leaves);
}

function publicUtilityCategory(row: ExpenseRow): PublicUtilityCategory | null {
  if (row.lineItem.includes("전기요금")) return "electricity";
  if (row.lineItem.includes("상하수도")) return "water";
  if (row.lineItem.includes("연료비")) return "fuel";
  if (row.lineItem.includes("공공요금") || row.lineItem.includes("제세공과금")) {
    return "other";
  }
  return null;
}

function sumExpense(
  rows: readonly ExpenseRow[],
  matches: (row: ExpenseRow) => boolean,
): Won {
  return rows
    .filter(matches)
    .reduce((sum, row) => won(sum + row.settlementAmount), won(0));
}

export function publicUtilityBreakdown(
  rows: readonly ExpenseRow[],
  bundle: number,
): PublicUtilityMetric[] {
  const leaves = expenseLeaves(rows, bundle);
  const labels: Record<PublicUtilityCategory, string> = {
    electricity: "전기요금",
    water: "상하수도료",
    fuel: "연료비",
    other: "기타 공공요금·제세",
  };
  return (Object.keys(labels) as PublicUtilityCategory[]).map((id) => ({
    id,
    label: labels[id],
    settlementAmount: sumExpense(
      leaves,
      (row) => publicUtilityCategory(row) === id,
    ),
  }));
}

function rigidExpenseCategory(row: ExpenseRow): RigidExpenseCategory | null {
  const utility = publicUtilityCategory(row);
  if (utility) return utility;
  const name = row.lineItem;
  if (/(시설관리.*용역|시설.*관리원.*용역)/.test(name)) return "facilityService";
  if (/청소.*용역/.test(name)) return "cleaningService";
  if (/경비|당직/.test(name)) return "securityService";
  if (/용역/.test(name)) return "otherService";
  if (/임차|렌탈/.test(name)) return "rental";
  if (/정기.*(유지|관리)|유지관리|시설일반관리/.test(name)) {
    return "regularMaintenance";
  }
  if (/방역관리|공기질관리|정수기.*관리|폐기물.*처리|소방.*관리|전기안전/.test(name)) {
    return "essentialOperation";
  }
  return null;
}

export function rigidExpenseBreakdown(
  rows: readonly ExpenseRow[],
  bundle: number,
): RigidExpenseMetric[] {
  const leaves = expenseLeaves(rows, bundle);
  const definitions: Array<Pick<RigidExpenseMetric, "id" | "group" | "label">> = [
    { id: "electricity", group: "공공요금", label: "전기요금" },
    { id: "water", group: "공공요금", label: "상하수도료" },
    { id: "fuel", group: "공공요금", label: "연료비" },
    { id: "other", group: "공공요금", label: "기타 공공요금·제세" },
    { id: "facilityService", group: "용역비", label: "시설관리용역" },
    { id: "cleaningService", group: "용역비", label: "청소용역" },
    { id: "securityService", group: "용역비", label: "경비/당직 관련 용역" },
    { id: "otherService", group: "용역비", label: "기타 반복 용역비" },
    { id: "regularMaintenance", group: "기타 고정성 운영비", label: "정기 유지관리비" },
    { id: "rental", group: "기타 고정성 운영비", label: "임차·렌탈 성격 비용" },
    {
      id: "essentialOperation",
      group: "기타 고정성 운영비",
      label: "반복적으로 발생하는 필수 운영비",
    },
  ];
  return definitions.map((definition) => ({
    ...definition,
    source: "analysisCategory" as const,
    settlementAmount: sumExpense(
      leaves,
      (row) => rigidExpenseCategory(row) === definition.id,
    ),
  }));
}

export function rigidExpenseSummary(
  rows: readonly ExpenseRow[],
  bundle: number,
): RigidExpenseSummary {
  const groups: Array<Pick<RigidExpenseGroupMetric, "group" | "label">> = [
    { group: "공공요금", label: "공공요금 합계" },
    { group: "용역비", label: "용역비 합계" },
    { group: "기타 고정성 운영비", label: "기타 고정비 합계" },
  ];
  const detail = rigidExpenseBreakdown(rows, bundle);
  const summarized = groups.map((group) => ({
    ...group,
    settlementAmount: detail
      .filter((item) => item.group === group.group)
      .reduce((sum, item) => won(sum + item.settlementAmount), won(0)),
  }));
  const totalSettlementAmount = summarized.reduce(
    (sum, group) => won(sum + group.settlementAmount),
    won(0),
  );
  const totalExpenseSettlementAmount = expenseTotal(rows, bundle);
  return {
    totalSettlementAmount,
    totalExpenseSettlementAmount,
    rate: rate(totalSettlementAmount, totalExpenseSettlementAmount),
    groups: summarized,
  };
}

export function getRigidExpenseSummary(
  rows: readonly ExpenseRow[],
  bundle: number,
): RigidExpenseSummary {
  return rigidExpenseSummary(rows, bundle);
}

export function expenseAnalysisMetrics(
  rows: readonly ExpenseRow[],
  bundle: number,
): ExpenseAnalysisMetric[] {
  const leaves = expenseLeaves(rows, bundle);
  const totalSettlementAmount = expenseTotal(rows, bundle);
  const publicUtility = publicUtilityBreakdown(rows, bundle).reduce(
    (sum, item) => won(sum + item.settlementAmount),
    won(0),
  );
  const definitions: Array<
    Omit<ExpenseAnalysisMetric, "settlementAmount" | "rate" | "totalSettlementAmount"> & {
      settlementAmount: Won;
    }
  > = [
    {
      id: "educationActivity",
      label: "교육활동 관련 비중",
      settlementAmount: sumExpense(leaves, (row) =>
        ["기본적 교육활동", "선택적 교육활동", "교육활동 지원"].includes(
          row.policyProgram,
        ),
      ),
      description:
        "기본·선택 교육활동과 교육활동 지원에 집행한 결산액의 비중입니다.",
    },
    {
      id: "meal",
      label: "급식 지출 비중",
      settlementAmount: sumExpense(
        leaves,
        (row) =>
          row.unitProgram === "급식 관리" || row.detailProgram === "학교급식운영",
      ),
      description: "학교급식 운영에 집행한 결산액의 비중입니다.",
    },
    {
      id: "facilityMaintenance",
      label: "시설·유지관리 비중",
      settlementAmount: sumExpense(
        leaves,
        (row) =>
          row.unitProgram === "시설 장비 유지" || row.policyProgram === "학교시설 확충",
      ),
      description:
        "시설 장비 유지와 학교시설 확충에 집행한 결산액의 비중입니다.",
    },
    {
      id: "publicUtility",
      label: "공공요금 비중",
      settlementAmount: publicUtility,
      description:
        "전기·수도·연료 등 공공요금 성격의 세부항목을 별도로 분류한 비중입니다.",
    },
  ];
  return definitions.map((definition) => ({
    ...definition,
    totalSettlementAmount,
    rate: rate(definition.settlementAmount, totalSettlementAmount),
  }));
}

export function getExpenseInsights(
  rows: readonly ExpenseRow[],
  bundle: number,
): Record<ExpenseAnalysisMetricId, ExpenseAnalysisMetric> {
  return Object.fromEntries(
    expenseAnalysisMetrics(rows, bundle).map((metric) => [metric.id, metric]),
  ) as Record<ExpenseAnalysisMetricId, ExpenseAnalysisMetric>;
}

const incomePath = (row: IncomeRow) => [
  row.chapter,
  row.section,
  row.subsection,
  row.item,
];

const expensePath = (row: ExpenseRow) => [
  row.policyProgram,
  row.unitProgram,
  row.detailProgram,
  row.lineItem,
];

function makeNode(
  row: SourceAmounts,
  path: string[],
  total: Won,
  hasChildren: boolean,
): BudgetNode {
  return {
    id: JSON.stringify([
      row.schoolCode,
      row.fiscalYear,
      row.referenceMonth,
      row.sourceBundleNumber,
      row.sourceRowNumber,
    ]),
    name: path.at(-1) ?? "",
    path,
    hasChildren,
    ...nodeMetrics(row, total),
    sourceUrl: row.sourceUrl,
    sourceRowNumber: row.sourceRowNumber,
  };
}

function level<T extends SourceAmounts & { rowType: string }>(
  rows: readonly T[],
  bundle: number,
  path: string[],
  types: readonly string[],
  pathOf: (row: T) => string[],
): BudgetNode[] {
  if (path.length >= types.length) return [];
  const scoped = selectBundle(rows, bundle);
  const total = getTotal(scoped, bundle).settlementAmount;
  return scoped
    .filter(
      (row) =>
        row.rowType === types[path.length] &&
        path.every((part, index) => pathOf(row)[index] === part),
    )
    .map((row) => {
      const current = pathOf(row).slice(0, path.length + 1);
      const hasChildren =
        path.length < types.length - 1 &&
        scoped.some(
          (child) =>
            child.rowType === types[path.length + 1] &&
            current.every((part, index) => pathOf(child)[index] === part),
        );
      return makeNode(row, current, total, hasChildren);
    });
}

export function getIncomeLevel(
  rows: readonly IncomeRow[],
  bundle: number,
  path: string[],
): BudgetNode[] {
  return level(rows, bundle, path, INCOME_LEVELS, incomePath);
}

export function getExpenseLevel(
  rows: readonly ExpenseRow[],
  bundle: number,
  path: string[],
): BudgetNode[] {
  return level(rows, bundle, path, EXPENSE_LEVELS, expensePath);
}

export function sortNodes(
  nodes: readonly BudgetNode[],
  key: SortKey,
  direction: "asc" | "desc",
): BudgetNode[] {
  return [...nodes].sort(
    (a, b) =>
      (direction === "asc" ? 1 : -1) * (a[key] - b[key]) ||
      a.sourceRowNumber - b.sourceRowNumber,
  );
}

export function getTopExpenseItems(
  rows: readonly ExpenseRow[],
  bundle: number,
  metric: "difference" | "settlementAmount",
): BudgetNode[] {
  const scoped = selectBundle(rows, bundle);
  const total = getTotal(scoped, bundle).settlementAmount;
  return sortNodes(
    scoped
      .filter((row) => row.rowType === "세부항목상세")
      .map((row) => makeNode(row, expensePath(row), total, false))
      .filter((node) => node[metric] > 0),
    metric,
    "desc",
  ).slice(0, 10);
}

export function schoolScaleMetrics(
  summary: BudgetSummary,
  profile?: LinkedSchoolProfile | null,
) {
  const matched =
    !!profile &&
    profile.schoolCode === summary.schoolCode &&
    profile.schoolName === summary.schoolName &&
    profile.referenceYear === summary.fiscalYear;
  const students =
    matched &&
    profile.studentCount !== null &&
    Number.isSafeInteger(profile.studentCount) &&
    profile.studentCount > 0
      ? profile.studentCount
      : null;
  const divide = (value: number | null | undefined, positive = false) =>
    students !== null &&
    value != null &&
    Number.isFinite(value) &&
    (positive ? value > 0 : value >= 0)
      ? value / students
      : null;
  return {
    students,
    reason: !matched
      ? "같은 연도의 학교정보가 연결되지 않았습니다."
      : students === null
        ? "계산에 필요한 학생수가 없습니다."
        : null,
    expensePerStudent: divide(summary.expenseSettlement),
    budgetPerStudent: divide(summary.currentBudget),
    sitePerStudent: divide(matched ? profile.siteAreaM2 : null, true),
  };
}

export function treemapData(nodes: readonly BudgetNode[]) {
  return nodes
    .filter((node) => node.settlementAmount > 0)
    .map((node) => ({
      id: node.id,
      name: node.name,
      value: node.settlementAmount,
    }));
}

const moneyScales: Record<MoneyUnit, number> = {
  원: 1,
  만원: 10_000,
  억원: 100_000_000,
};

export function money(value: number | null, unit: MoneyUnit = "원"): string {
  if (value === null) return "—";
  won(value);
  return (value / moneyScales[unit]).toLocaleString("ko-KR", {
    minimumFractionDigits: unit === "원" ? 0 : 2,
    maximumFractionDigits: unit === "원" ? 0 : 2,
  });
}

export function percent(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(2)}%`;
}
