export function formatEditableMoney(value: number) {
  return Number.isFinite(value) ? Math.trunc(value).toLocaleString("ko-KR") : "0";
}

export function parseEditableMoney(value: string) {
  const normalized = value.replace(/[^\d-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

