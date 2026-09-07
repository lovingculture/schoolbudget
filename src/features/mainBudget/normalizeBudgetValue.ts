export function normalizeLabel(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, "") : "";
}

export function parseBudgetNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && Number.isInteger(value) ? value : null;
  }

  if (typeof value !== "string") return null;

  const normalized = value
    .replace(/[\s,]/g, "")
    .replace(/천원|원/g, "")
    .replace(/=$/, "");

  if (!/^-?\d+$/.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function stripHierarchyPrefix(value: string): string {
  return value.replace(/^\s*\d+\.\s*/, "");
}
