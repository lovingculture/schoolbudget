import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import type { BudgetResource, BudgetResourceInput, ResourceCategory } from "./resourceTypes";
import { validateResourceInput } from "./resourceValidation";

type Props = {
  mode: "create" | "edit";
  resource?: BudgetResource;
  onSubmit: (input: BudgetResourceInput, file?: File) => Promise<void>;
  onCancel: () => void;
};

export function ResourceAdminDialog({ mode, resource, onSubmit, onCancel }: Props) {
  const dialogRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(resource?.title ?? "");
  const [description, setDescription] = useState(resource?.description ?? "");
  const [category, setCategory] = useState<ResourceCategory>(resource?.category ?? "reference");
  const [schoolYear, setSchoolYear] = useState(resource?.schoolYear ?? new Date().getFullYear());
  const [isPublic, setIsPublic] = useState(resource?.isPublic ?? true);
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialogTitle = mode === "create" ? "자료 등록" : "자료 수정";

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    titleRef.current?.focus();
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      previouslyFocused?.focus();
    };
  }, [onCancel]);

  const keepFocusInside = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    ) ?? []);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const input = { title, description, category, schoolYear, isPublic };
    const errors = validateResourceInput({ ...input, file });
    if (mode === "create" && !file) errors.push("등록할 파일을 선택하세요.");
    if (errors.length) {
      setError(errors.join(" "));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSubmit(input, file);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "자료를 저장하지 못했습니다.");
      setBusy(false);
    }
  };

  return (
    <div className="resource-dialog-backdrop">
      <section ref={dialogRef} className="resource-dialog" role="dialog" aria-modal="true" aria-labelledby="resource-dialog-title" onKeyDown={keepFocusInside}>
        <h2 id="resource-dialog-title">{dialogTitle}</h2>
        <p className="resource-dialog-warning">개인정보가 포함된 파일은 등록하지 마세요.</p>
        <form onSubmit={submit}>
          <label>자료 제목<input ref={titleRef} maxLength={150} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>설명<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          <div className="resource-dialog-grid">
            <label>분류
              <select value={category} onChange={(event) => setCategory(event.target.value as ResourceCategory)}>
                <option value="guide">지침</option><option value="template">양식</option><option value="reference">참고자료</option>
              </select>
            </label>
            <label>학년도<input type="number" min={2000} max={2100} value={schoolYear} onChange={(event) => setSchoolYear(Number(event.target.value))} /></label>
          </div>
          <label>파일<input type="file" accept=".pdf,.xls,.xlsx,.docx,.hwp,.hwpx" onChange={(event) => setFile(event.target.files?.[0])} /></label>
          {mode === "edit" && resource && <small>현재 파일: {resource.originalFilename}</small>}
          <label className="resource-dialog-checkbox"><input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} /> 공개 자료로 표시</label>
          {busy && <p role="status">저장 중입니다.</p>}
          {error && <p role="alert" className="resource-dialog-error">{error}</p>}
          <div className="resource-dialog-actions">
            <button type="button" onClick={onCancel} disabled={busy}>취소</button>
            <button type="submit" disabled={busy}>{mode === "create" ? "등록하기" : "저장하기"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
