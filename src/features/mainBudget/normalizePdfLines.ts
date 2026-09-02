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

const tableHeaderPattern = /(예산액|원가통계비목|정책사업|단위사업|세부사업|세부항목)/;

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

function mergeAdjacentItems(items: PositionedItem[]): PositionedItem[] {
  const merged: PositionedItem[] = [];
  for (const item of [...items].sort((left, right) => left.x - right.x)) {
    const previous = merged.at(-1);
    if (!previous) {
      merged.push({ ...item });
      continue;
    }
    const gap = item.x - (previous.x + previous.width);
    const tolerance = Math.max(2, Math.min(previous.height || 2, item.height || 2) * 0.25);
    if (gap > tolerance) {
      merged.push({ ...item });
      continue;
    }
    const right = Math.max(previous.x + previous.width, item.x + item.width);
    previous.str += item.str;
    previous.width = right - previous.x;
    previous.height = Math.max(previous.height, item.height);
    previous.confidence = Math.min(previous.confidence, item.confidence);
  }
  return merged;
}

function gridForLines(lines: PositionedLine[]): number[] {
  const headerItems = lines
    .filter((line) => tableHeaderPattern.test(line.items.map((item) => item.str).join("")))
    .flatMap((line) => line.items)
    .sort((left, right) => left.x - right.x);
  if (headerItems.length > 0) {
    const clusterXs = (values: number[]) => {
      const clusters: Array<{ x: number; count: number }> = [];
      for (const x of [...values].sort((left, right) => left - right)) {
        const cluster = clusters.at(-1);
        if (!cluster || Math.abs(x - cluster.x) > 8) {
          clusters.push({ x, count: 1 });
        } else {
          cluster.x = ((cluster.x * cluster.count) + x) / (cluster.count + 1);
          cluster.count += 1;
        }
      }
      return clusters.map(({ x }) => x);
    };
    let grid = clusterXs(headerItems.map((item) => item.x));
    const connectedItems = lines
      .filter((line) => line.items.some((item) => grid.some((x) => Math.abs(item.x - x) <= 18)))
      .flatMap((line) => line.items);
    grid = clusterXs([...grid, ...connectedItems.map((item) => item.x)]);
    return grid;
  }
  const reference = [...lines].sort((left, right) => right.items.length - left.items.length)[0];
  return reference?.items.map((item) => item.x) ?? [];
}

function alignToGrid(line: PositionedLine, grid: number[]): PositionedItem[] {
  if (grid.length <= 1 || line.items.length > grid.length) return line.items;
  const assignments = line.items.map((item) => {
    let column = -1;
    let distance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < grid.length; index += 1) {
      const candidateDistance = Math.abs(item.x - grid[index]);
      if (candidateDistance < distance) {
        column = index;
        distance = candidateDistance;
      }
    }
    return { column, distance, item };
  });
  const tolerance = Math.max(8, Math.min(18, (line.height || 8) * 1.5));
  if (assignments.some(({ distance }) => distance > tolerance)
    || new Set(assignments.map(({ column }) => column)).size !== assignments.length) return line.items;
  const byColumn = new Map(assignments.map(({ column, item }) => [column, item]));
  return grid.map((x, column) => byColumn.get(column) ?? {
    str: "",
    x,
    y: line.baseline,
    width: 0,
    height: 0,
    confidence: 1,
  });
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

  for (const line of lines) line.items = mergeAdjacentItems(line.items);
  const grid = gridForLines(lines);

  return lines
    .sort((left, right) => right.baseline - left.baseline)
    .map((line, index) => {
      const ordered = alignToGrid(line, grid);
      return {
        cells: ordered.map((item) => item.str),
        sourcePage: pageNumber,
        sourceRow: index + 1,
        coordinates: ordered.map(({ x, y, width, height }) => ({ x, y, width, height })),
        confidence: Math.min(...ordered.filter((item) => item.str).map((item) => item.confidence)),
      };
    });
}
