import { useState, type ChangeEvent, type DragEvent } from "react";

type MainBudgetUploadProps = {
  disabled: boolean;
  onFile: (file: File) => void;
  onSelectionError: (message: string) => void;
};

const exactOneFileMessage = "분석할 파일을 정확히 하나만 선택해 주세요.";

export function MainBudgetUpload({ disabled, onFile, onSelectionError }: MainBudgetUploadProps) {
  const [dragging, setDragging] = useState(false);

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.currentTarget.files;
    const selected = files?.length === 1 ? files[0] : null;
    event.currentTarget.value = "";
    if (!selected) {
      onSelectionError(exactOneFileMessage);
      return;
    }
    onFile(selected);
  };

  const dropFile = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    const files = event.dataTransfer.files;
    if (files.length !== 1) {
      onSelectionError(exactOneFileMessage);
      return;
    }
    const file = files.item(0);
    if (file) onFile(file);
  };

  return (
    <>
      <section className="main-budget-download-guide" aria-labelledby="main-budget-download-guide-title">
        <div className="main-budget-download-guide-copy">
          <span>에듀파인 자료 준비</span>
          <h2 id="main-budget-download-guide-title">세입·세출예산명세서 내려받는 경로</h2>
          <ol className="main-budget-guide-steps" aria-label="에듀파인 메뉴 이동 경로">
            <li><span>1</span><b>학교회계</b></li>
            <li><span>2</span><b>예산관리</b></li>
            <li><span>3</span><b>예산현황(학교)</b></li>
            <li><span>4</span><b>예산서현황</b></li>
          </ol>
          <p className="main-budget-guide-highlight">
            예산서 현황에서 세입예산 명세서와 세출예산 명세서를 각각 클릭한 뒤 Excel(.xls 또는 .xlsx)로 저장합니다.
          </p>
        </div>
        <figure className="main-budget-guide-figure">
          <img src="/guides/edu-finance-main-budget-statements.png" alt="학교명이 가려진 에듀파인 예산서현황 화면에서 세입예산명세서와 세출예산명세서를 선택하는 예시" />
          <figcaption>세입예산명세서와 세출예산명세서를 각각 클릭한 뒤 Excel(.xls 또는 .xlsx)로 저장합니다.</figcaption>
        </figure>
      </section>
      <section
        className={`main-budget-upload${dragging ? " dragging" : ""}`}
        aria-labelledby="main-budget-upload-title"
        onDragEnter={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={dropFile}
      >
        <div className="main-budget-upload-copy">
          <span className="main-budget-upload-icon" aria-hidden="true">↑</span>
          <div>
            <h2 id="main-budget-upload-title">본예산서 파일 불러오기</h2>
            <p>K-에듀파인에서 내려받은 세입예산명세서와 세출예산명세서가 들어 있는 Excel 파일을 선택하세요.</p>
            <small>지원 형식: XLS, XLSX · 원본 파일은 브라우저 밖으로 전송되지 않습니다.</small>
          </div>
        </div>
        <label className={`main-budget-file-button${disabled ? " disabled" : ""}`}>
          파일 선택
          <input
            type="file"
            accept=".xls,.xlsx"
            aria-label="본예산 파일 선택"
            disabled={disabled}
            onChange={selectFile}
          />
        </label>
      </section>
    </>
  );
}
