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
          <p>K-에듀파인에서 출력한 본예산 Excel 파일 하나를 선택하세요.</p>
          <small>지원 형식: XLS, XLSX · 원본 파일은 브라우저 밖으로 전송되지 않습니다.</small>
        </div>
      </div>
      <label className={`main-budget-file-button${disabled ? " disabled" : ""}`}>
        파일 선택
        <input
          type="file"
          accept=".pdf,.xls,.xlsx"
          aria-label="본예산 파일 선택"
          disabled={disabled}
          onChange={selectFile}
        />
      </label>
    </section>
  );
}
