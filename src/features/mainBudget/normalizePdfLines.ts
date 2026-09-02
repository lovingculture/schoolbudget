import type { BudgetLogicalRow } from "./analysisTypes";

export type PdfLineItem = {
  str: string;
  transform?: ArrayLike<number>;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  confidence?: number;
};

type PositionedItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
};

type PositionedLine = {
  items: PositionedItem[];
  baseline: number;
  height: number;
};

function finiteOr(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? value as number : fallback;
}

function normalizedConfidence(value: number | undefined): number {
  if (!Number.isFinite(value)) return 1;
  const ratio = value as number > 1 ? (value as number) / 100 : value as number;
  return Math.min(1, Math.max(0, ratio));
}

function positionItem(item: PdfLineItem): PositionedItem | null {
  const str = item.str.trim();
  if (!str) return null;
  const transform = item.transform;
  const transformHeight = transform === undefined
    ? 0
    : Math.hypot(finiteOr(transform[2], 0), finiteOr(transform[3], 0));
  return {
    str,
    x: finiteOr(item.x, finiteOr(transform?.[4], 0)),
    y: finiteOr(item.y, finiteOr(transform?.[5], 0)),
    width: Math.max(0, finiteOr(item.width, 0)),
    height: Math.max(0, finiteOr(item.height, transformHeight)),
    confidence: normalizedConfidence(item.confidence),
  };
}

function belongsToLine(item: PositionedItem, line: PositionedLine): boolean {
  const tolerance = Math.max(2, Math.min(6, Math.min(item.height || 2, line.height || 2) * 0.35));
  return Math.abs(item.y - line.baseline) <= tolerance;
}

export function normalizePdfLines(items: readonly PdfLineItem[], pageNumber: number): BudgetLogicalRow[] {
  const positioned = items
    .map(positionItem)
    .filter((item): item is PositionedItem => item !== null)
    .sort((left, right) => right.y - left.y || left.x - right.x);
  const lines: PositionedLine[] = [];

  for (const item of positioned) {
    const line = lines.find((candidate) => belongsToLine(item, candidate));
    if (!line) {
      lines.push({ items: [item], baseline: item.y, height: item.height });
      continue;
    }
    const nextCount = line.items.length + 1;
    line.baseline = ((line.baseline * line.items.length) + item.y) / nextCount;
    line.height = Math.max(line.height, item.height);
    line.items.push(item);
  }

  return lines
    .sort((left, right) => right.baseline - left.baseline)
    .map((line, index) => {
      const ordered = [...line.items].sort((left, right) => left.x - right.x);
      return {
        cells: ordered.map((item) => item.str),
        sourcePage: pageNumber,
        sourceRow: index + 1,
        coordinates: ordered.map(({ x, y, width, height }) => ({ x, y, width, height })),
        confidence: Math.min(...ordered.map((item) => item.confidence)),
      };
    });
}
