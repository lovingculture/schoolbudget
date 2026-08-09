import type { ChangeEvent } from "react";

export interface ExpenditureFileStatus {
  name: string;
  status: "success" | "error" | "empty";
  rowCount: number;
  total: number;
  message: string;
}

export function ExpenditureUploadPanel({ busy, files, onFiles }: { busy: boolean; files: ExpenditureFileStatus[]; onFiles(files: File[]): void }) {
  const selectFiles = (event: ChangeEvent<HTMLInputElement>) => {
    onFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  };
  return <section className="main-budget-upload">
    <div><h2>부서별 세출 요구자료</h2><p>각 부서에서 받은 엑셀 파일을 한 번에 선택하세요. 기존 자료에 이어서 수합됩니다.</p></div>
    <label className="main-budget-file-button">{busy ? "파일 처리 중…" : "세출파일 여러 개 선택"}<input aria-label="부서별 세출 요구자료 선택" type="file" accept=".xls,.xlsx" multiple disabled={busy} onChange={selectFiles} /></label>
    {files.length > 0 && <div className="main-budget-files" aria-label="파일 처리 현황">{files.map((file, index) => <article key={`${file.name}-${index}`} className={file.status}>
      <b>{file.name}</b><span>{file.rowCount}건 · {file.total.toLocaleString()}원</span><small>{file.message}</small>
    </article>)}</div>}
  </section>;
}
