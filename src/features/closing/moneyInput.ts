export const formatEditableMoney = (value: number): string =>
  Math.trunc(Number.isFinite(value) ? value : 0).toLocaleString("ko-KR");

export const parseEditableMoney = (text: string): number => {
  const negative = text.trim().startsWith("-");
  const digits = text.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits) * (negative ? -1 : 1);
};
