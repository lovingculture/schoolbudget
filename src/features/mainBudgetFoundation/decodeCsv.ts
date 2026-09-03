export type BudgetCsvEncoding = "utf-8" | "euc-kr";

const REQUIRED_MARKERS = ["세입예산명세서", "세출예산명세서"];

function decode(bytes: ArrayBuffer, encoding: BudgetCsvEncoding): string {
  return new TextDecoder(encoding, { fatal: false }).decode(bytes).replace(/^\uFEFF/, "");
}

function score(text: string): number {
  const markers = REQUIRED_MARKERS.filter((marker) => text.includes(marker)).length;
  const replacements = text.match(/�/g)?.length ?? 0;
  const Korean = text.match(/[가-힣]/g)?.length ?? 0;
  return markers * 10_000 + Korean - replacements * 100;
}

export function decodeBudgetCsv(bytes: ArrayBuffer): { text: string; encoding: BudgetCsvEncoding } {
  const candidates = (["utf-8", "euc-kr"] as const).map((encoding) => ({
    encoding,
    text: decode(bytes, encoding),
  }));
  candidates.sort((left, right) => score(right.text) - score(left.text));
  return candidates[0];
}
