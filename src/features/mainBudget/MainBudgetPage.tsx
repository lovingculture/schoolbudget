import { useEffect, useMemo, useState } from "react";
import { ExpenditureTable } from "./ExpenditureTable";
import { ExpenditureUploadPanel, type ExpenditureFileStatus } from "./ExpenditureUploadPanel";
import { parseExpenditureWorkbook } from "./parseExpenditureWorkbook";
import { reviewExpenditures } from "./reviewExpenditures";
import { summarizeExpenditures } from "./summarizeExpenditures";
import type { MainBudgetExpenditureRow } from "./types";
import { mainBudgetStorage } from "./storage";
import "./mainBudget.css";

const money = (value: number) => `${value.toLocaleString()}원`;
export function MainBudgetPage() {
  const [tab, setTab] = useState<"expenditure" | "revenue">("expenditure");
  const restored = useMemo(() => mainBudgetStorage.load(), []);
  const [rows, setRows] = useState<MainBudgetExpenditureRow[]>(restored?.rows ?? []);
  const [files, setFiles] = useState<ExpenditureFileStatus[]>(restored?.files ?? []);
  const [busy, setBusy] = useState(false);
  const summary = useMemo(() => summarizeExpenditures(rows), [rows]);
  useEffect(() => { if (rows.length || files.length) mainBudgetStorage.save({ rows, files }); }, [rows, files]);

  const clearExpenditures = () => {
    if (!window.confirm("수합한 세출자료를 모두 초기화하시겠습니까?")) return;
    setRows([]); setFiles([]); mainBudgetStorage.clear();
  };

  const addFiles = async (selected: File[]) => {
    if (!selected.length) return;
    setBusy(true);
    const results = await Promise.allSettled(selected.map(parseExpenditureWorkbook));
    const addedRows: MainBudgetExpenditureRow[] = [];
    const addedFiles: ExpenditureFileStatus[] = results.map((result, index) => {
      if (result.status === "rejected") return { name: selected[index].name, status: "error", rowCount: 0, total: 0, message: result.reason instanceof Error ? result.reason.message : "파일을 처리하지 못했습니다." };
      addedRows.push(...result.value.rows);
      return { name: result.value.fileName, status: result.value.rows.length ? "success" : "empty", rowCount: result.value.rows.length, total: result.value.rows.reduce((sum, row) => sum + (row.requestedAmount ?? 0), 0), message: result.value.warnings[0] ?? "정상 인식" };
    });
    setRows((current) => reviewExpenditures([...current, ...addedRows]));
    setFiles((current) => [...current, ...addedFiles]);
    setBusy(false);
  };

  return <div className="content main-budget-page">
    <div className="page-title"><span>MAIN BUDGET</span><h1>본예산 편성·검토</h1><p>부서별 세출 요구자료를 수합하고 오류를 확인합니다.</p></div>
    <div className="main-budget-tabs" role="tablist" aria-label="본예산 자료 구분">
      <button role="tab" aria-selected={tab === "expenditure"} onClick={() => setTab("expenditure")}>세출자료 통합·검토</button>
      <button role="tab" aria-selected={tab === "revenue"} onClick={() => setTab("revenue")}>세입자료·3% 검토</button>
    </div>
    {tab === "revenue" ? <section className="main-budget-revenue"><h2>세입자료·업무추진비 3% 검토</h2><p>세입자료를 등록하면 업무추진비 3% 한도를 계산할 수 있습니다.</p><div className="main-budget-placeholder">세입자료 양식을 확인한 뒤 업로드 기능이 연결됩니다.<br />현재 수합한 세출자료 {rows.length}건은 그대로 유지됩니다.</div></section> : <>
      <ExpenditureUploadPanel busy={busy} files={files} onFiles={addFiles} />
      {(rows.length > 0 || files.length > 0) && <button type="button" className="main-budget-reset" onClick={clearExpenditures}>세출자료 초기화</button>}
      <div className="main-budget-summary">
        <article><span>총 요구액</span><b>{money(summary.requestedTotal)}</b></article><article><span>전년 요구액</span><b>{money(summary.priorTotal)}</b></article><article><span>증감액</span><b>{money(summary.variance)}</b></article><article><span>부서 수</span><b>{summary.departmentCount}개</b></article><article><span>확인 필요</span><b>{summary.unresolvedCount + summary.reviewCount}건</b></article><article><span>오류·주의</span><b>{summary.errorCount + summary.warningCount}건</b></article>
      </div>
      <ExpenditureTable rows={rows} />
    </>}
  </div>;
}
