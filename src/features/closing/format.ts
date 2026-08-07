export const formatWon = (value: number) =>
  value === 0 ? "-" : Math.round(value).toLocaleString("ko-KR");

export const formatRatio = (value: number) => Number(value).toFixed(1);

export const closingFileBaseName = (year: number) =>
  `1.(심의안건) ${year}학년도 학교회계 세입세출 결산 (안)`;
