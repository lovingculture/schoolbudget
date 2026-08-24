import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Clipboard, Download, FileText, Plus, X } from "lucide-react";
import {
  DEFAULT_ACCOUNT_CATEGORIES,
  PREBUDGET_BUSINESS_OPTIONS,
  calculateRequestedAmount,
  getAccountCategoryDescription,
  getDetailBusinesses,
} from "../../domain/prebudget";
import type { DraftItem } from "../../domain/prebudget";
import {
  createPrebudgetDocument,
  type PrebudgetDocument,
} from "./createDocument";
import {
  activePrebudgetItems,
  createBlankPrebudgetItem,
  createPrebudgetDraft,
} from "./draft";
import {
  downloadBlob,
  exportPrebudgetExcel,
  exportPrebudgetHwpx,
  prebudgetFilename,
} from "./exporters";
import { createBrowserDraftStorage, type DraftStorage } from "./storage";
import type { PrebudgetFormDraft } from "./types";
import { validatePrebudgetForm } from "./validation";
import { applyPrebudgetExample } from "./examples/applyExample";
import { PREBUDGET_EXAMPLES } from "./examples/data";
import { PrebudgetExampleLibrary } from "./examples/PrebudgetExampleLibrary";
import { PrebudgetFundingGuide } from "./examples/PrebudgetFundingGuide";
import type {
  ExampleFundingCategory,
  PrebudgetExample,
} from "./examples/types";
import { PrebudgetHeader } from "./PrebudgetHeader";
import "./prebudget.css";

export function PrebudgetPage({
  initialSchoolName,
  storage = createBrowserDraftStorage(),
}: {
  initialSchoolName: string;
  storage?: DraftStorage;
}) {
  const [storedDraft, setStoredDraft] = useState<PrebudgetFormDraft | null>(
    () => storage.load(),
  );
  const [draft, setDraft] = useState<PrebudgetFormDraft>(
    () => createPrebudgetDraft(initialSchoolName),
  );
  const [view, setView] = useState<"form" | "funding-guide" | "examples">(
    "form",
  );
  const [exampleCategory, setExampleCategory] =
    useState<ExampleFundingCategory>("목적사업비");
  const [message, setMessage] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [document, setDocument] = useState<PrebudgetDocument | null>(null);
  const [workingExport, setWorkingExport] = useState<"hwpx" | null>(null);
  const previewRef = useRef<HTMLElement>(null);
  const total = useMemo(
    () =>
      activePrebudgetItems(draft.items).reduce(
        (sum, i) => sum + calculateRequestedAmount(i),
        0,
      ),
    [draft.items],
  );
  const blank = useMemo(
    () => createPrebudgetDraft(initialSchoolName),
    [initialSchoolName],
  );
  const itemGroups = useMemo(() => {
    const groups: Array<{ key: string; indices: number[] }> = [];
    const byKey = new Map<string, { key: string; indices: number[] }>();
    draft.items.forEach((item, index) => {
      const commonValues = [item.unitBusiness ?? "", item.business ?? "", item.detail ?? ""];
      const lookupKey = commonValues.some(Boolean)
        ? commonValues.join("\u0000")
        : `blank-${item.id ?? index}`;
      const existing = byKey.get(lookupKey);
      if (existing) {
        existing.indices.push(index);
        return;
      }
      const group = { key: String(item.id ?? index), indices: [index] };
      byKey.set(lookupKey, group);
      groups.push(group);
    });
    return groups;
  }, [draft.items]);
  useEffect(() => {
    globalThis.document
      .querySelectorAll(".category-help")
      .forEach((node) => node.setAttribute("aria-label", "비목 설명"));
  }, [draft.items]);
  const field = <K extends keyof PrebudgetFormDraft>(
    key: K,
    value: PrebudgetFormDraft[K],
  ) =>
    setDraft((d) => {
      const reviewRequiredFields =
        typeof value === "string" && !/(○○|0000|20XX)/.test(value)
          ? d.reviewRequiredFields.filter((fieldName) => fieldName !== key)
          : d.reviewRequiredFields;
      return { ...d, [key]: value, reviewRequiredFields };
    });
  const updateItem = (
    index: number,
    key: keyof DraftItem,
    value: string | number,
  ) =>
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, i) => {
        if (i !== index) return item;
        if (key === "unitBusiness")
          return { ...item, unitBusiness: String(value), business: "" };
        if (key === "unitPrice" || key === "quantity" || key === "count") {
          const { manualAmount: _manualAmount, ...calculatedItem } = item;
          return { ...calculatedItem, [key]: value };
        }
        return { ...item, [key]: value };
      }),
    }));
  const updateGroup = (
    indices: number[],
    key: "unitBusiness" | "business" | "detail",
    value: string,
  ) =>
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, index) => {
        if (!indices.includes(index)) return item;
        if (key === "unitBusiness") {
          return { ...item, unitBusiness: value, business: "" };
        }
        return { ...item, [key]: value };
      }),
    }));
  const addCalculationRow = (indices: number[]) =>
    setDraft((current) => {
      const first = current.items[indices[0]];
      const insertAt = Math.max(...indices) + 1;
      const nextItem = {
        ...createBlankPrebudgetItem(),
        unitBusiness: first?.unitBusiness ?? "",
        business: first?.business ?? "",
        detail: first?.detail ?? "",
      };
      const items = [...current.items];
      items.splice(insertAt, 0, nextItem);
      return { ...current, items };
    });
  const save = () => {
    const savedAt = new Date().toISOString();
    const next = { ...draft, savedAt };
    storage.save(next);
    setStoredDraft(null);
    setDraft(next);
    setMessage(
      `이 브라우저에 임시저장했습니다. (${new Date(savedAt).toLocaleString("ko-KR")})`,
    );
  };
  const generate = () => {
    const nextIssues = validatePrebudgetForm(draft);
    setIssues(nextIssues.map((i) => i.message));
    if (nextIssues.length) {
      setDocument(null);
      setMessage("입력 내용을 확인해 주세요.");
      return;
    }
    const next = createPrebudgetDocument(draft);
    setDocument(next);
    setMessage("자동점검을 통과했습니다.");
    setTimeout(
      () => previewRef.current?.scrollIntoView({ behavior: "smooth" }),
      0,
    );
  };
  const hasMeaningfulDraft =
    draft.title !== blank.title ||
    draft.officialDocument.trim() !== "" ||
    activePrebudgetItems(draft.items).length > 0;
  const useExample = (example: PrebudgetExample) => {
    if (
      hasMeaningfulDraft &&
      !window.confirm(
        "현재 작성 중인 내용이 예시 내용으로 바뀝니다. 계속하시겠습니까?",
      )
    ) {
      setView("form");
      return;
    }
    setDraft((current) => applyPrebudgetExample(current, example));
    setDocument(null);
    setIssues([]);
    setMessage(
      "예시를 불러왔습니다. 확인 필요 항목을 실제 공문에 맞게 수정해 주세요.",
    );
    setView("form");
  };
  const downloadHwpx = async () => {
    if (!document || workingExport) return;
    setWorkingExport("hwpx");
    setMessage("");
    try {
      downloadBlob(
        await exportPrebudgetHwpx(document),
        prebudgetFilename(document.title, "hwpx"),
      );
    } catch {
      setMessage("한글(HWPX) 파일을 만들지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setWorkingExport(null);
    }
  };
  if (view === "funding-guide")
    return (
      <div className="content portal-workspace">
        <PrebudgetFundingGuide
          onSelect={(category) => {
            setExampleCategory(category);
            setView("examples");
          }}
          onUnsure={() =>
            setMessage(
              "교부공문 발신기관·제목, 구청 보조금 교부결정서 또는 가정통신문과 징수계획을 확인하세요. 포털이 재원을 임의로 결정하지 않습니다.",
            )
          }
        />
        {message && (
          <p className="prebudget-message" role="status">
            {message}
          </p>
        )}
        <button type="button" className="prebudget-guide-back" onClick={() => setView("form")}>
          <ArrowLeft aria-hidden="true" />
          직접 작성으로 돌아가기
        </button>
      </div>
    );
  if (view === "examples")
    return (
      <div className="content portal-workspace">
        <PrebudgetExampleLibrary
          examples={PREBUDGET_EXAMPLES}
          initialScope={exampleCategory}
          onUseExample={useExample}
          onBack={() => setView("funding-guide")}
        />
      </div>
    );
  return (
    <div className="content prebudget-page portal-workspace">
      <PrebudgetHeader
        documentReady={Boolean(document)}
        onOpenExamples={() => setView("funding-guide")}
      />
      {storedDraft && (
        <section className="prebudget-saved-draft" aria-label="임시저장 안내">
          <div>
            <b>이 브라우저에 임시저장된 내용이 있습니다.</b>
            <p>이전 작업을 계속하려면 저장된 내용을 불러오세요.</p>
          </div>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setDraft(storedDraft);
              setDocument(null);
              setIssues([]);
              setMessage("임시저장된 내용을 불러왔습니다.");
              setStoredDraft(null);
            }}
          >
            임시저장 불러오기
          </button>
        </section>
      )}
      {draft.exampleSourceId && draft.reviewRequiredFields.length > 0 && (
        <section className="prebudget-errors" aria-label="확인 필요 항목">
          <b>예시를 복사한 초안입니다</b>
          <p>실제 공문과 금액을 확인하기 전에는 확정 문서로 사용하지 마세요.</p>
          <ul>
            {draft.reviewRequiredFields.map((name) => (
              <li key={name}>
                {({ officialDocument: "관련 공문" } as Record<string, string>)[
                  name
                ] ?? name}{" "}
                확인 필요
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="form-card">
        <h2>기본정보</h2>
        <div className="form-grid">
          <label>
            회계연도
            <input
              type="number"
              value={draft.fiscalYear}
              onChange={(e) => field("fiscalYear", Number(e.target.value))}
            />
          </label>
          <label>
            재원구분
            <select
              value={draft.source}
              onChange={(e) =>
                field("source", e.target.value as PrebudgetFormDraft["source"])
              }
            >
              <option>보조금(구청)</option>
              <option>목적사업비(교육청)</option>
              <option>수익자부담경비(학부모)</option>
            </select>
          </label>
          <label className="wide">
            문서 제목
            <input
              value={draft.title}
              placeholder="안전인력봉사비 성립전예산 편성 요청"
              onChange={(e) => field("title", e.target.value)}
            />
          </label>
          <label>
            부서명
            <input
              value={draft.department}
              placeholder="예: 체육안전교육부"
              onChange={(e) => field("department", e.target.value)}
            />
          </label>
          <label>
            사업담당자
            <input
              value={draft.requester}
              placeholder="예: 김담당"
              onChange={(e) => field("requester", e.target.value)}
            />
          </label>
          <label>
            예산(품의) 권한 부여 대상
            <input
              value={draft.approvalGranter}
              onChange={(e) => field("approvalGranter", e.target.value)}
            />
          </label>
          <label className="wide">
            관련 공문
            <input
              value={draft.officialDocument}
              onChange={(e) => field("officialDocument", e.target.value)}
              placeholder="예: 교육지원과-1234(2026. 8. 1.)"
            />
          </label>
        </div>
      </section>
      <section className="form-card">
        <div className="card-title-row">
          <div>
            <h2>예산항목</h2>
            <p>산출기초를 입력하면 요구금액이 자동 계산됩니다.</p>
          </div>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              field("items", [...draft.items, createBlankPrebudgetItem()])
            }
          >
            <Plus size={16} /> 새 예산항목 묶음 추가
          </button>
        </div>
        <div className="item-list prebudget-group-list">
          {itemGroups.map((group, groupIndex) => {
            const sharedItem = draft.items[group.indices[0]];
            const groupTotal = group.indices.reduce(
              (sum, index) => sum + calculateRequestedAmount(draft.items[index]),
              0,
            );
            return (
            <section className="prebudget-item-group" key={group.key || `blank-${groupIndex}`}>
              <div className="prebudget-group-heading">
                <div className="item-number">{groupIndex + 1}</div>
                <strong>예산항목 {groupIndex + 1}</strong>
              </div>
              <div className="prebudget-common-fields">
                <label>
                  단위사업
                  <select
                    value={sharedItem.unitBusiness ?? ""}
                    onChange={(e) =>
                      updateGroup(group.indices, "unitBusiness", e.target.value)
                    }
                  >
                    <option value="">선택하세요</option>
                    {PREBUDGET_BUSINESS_OPTIONS.map(([v]) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  세부사업
                  <select
                    value={sharedItem.business ?? ""}
                    disabled={!sharedItem.unitBusiness}
                    onChange={(e) => updateGroup(group.indices, "business", e.target.value)}
                  >
                    <option value="">
                      {sharedItem.unitBusiness
                        ? "선택하세요"
                        : "단위사업을 먼저 선택하세요"}
                    </option>
                    {getDetailBusinesses(sharedItem.unitBusiness).map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  세부항목
                  <input
                    value={sharedItem.detail ?? ""}
                    onChange={(e) => updateGroup(group.indices, "detail", e.target.value)}
                  />
                </label>
              </div>
              <div className="prebudget-calculation-list">
                {group.indices.map((i, rowIndex) => {
                  const item = draft.items[i];
                  return (
                  <div className="prebudget-calculation-row" key={item.id}>
                    <span className="prebudget-row-number">{rowIndex + 1}</span>
                    <div className="category-field">
                  <label>
                    원가통계비목
                    <select
                      value={item.category}
                      onChange={(e) =>
                        updateItem(i, "category", e.target.value)
                      }
                    >
                      {DEFAULT_ACCOUNT_CATEGORIES.map(([v]) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <aside className="category-help">
                    <b>비목 설명</b>
                    <p>{getAccountCategoryDescription(item.category)}</p>
                  </aside>
                    </div>
                    <label className="description">
                  산출내역
                  <input
                    aria-label="산출내역"
                    placeholder="예: 안전인력 봉사활동비"
                    value={item.description ?? ""}
                    onChange={(e) =>
                      updateItem(i, "description", e.target.value)
                    }
                  />
                    </label>
                    <div className="formula">
                  {(["unitPrice", "quantity", "count"] as const).map(
                    (key, n) => (
                      <label key={key}>
                        {["단가", "수량", "횟수"][n]}
                        <input
                          aria-label={["단가", "수량", "횟수"][n]}
                          type="text"
                          inputMode="numeric"
                          placeholder={["예: 40,000", "예: 1", "예: 20"][n]}
                          value={item[key] ? Number(item[key]).toLocaleString("ko-KR") : ""}
                          onChange={(e) =>
                            updateItem(i, key, Number(e.target.value.replace(/[^0-9]/g, "")))
                          }
                          onFocus={(e) => e.currentTarget.select()}
                        />
                      </label>
                    ),
                  )}
                  <output>
                    {calculateRequestedAmount(item).toLocaleString()}원
                  </output>
                    </div>
                    <button
                      type="button"
                      className="remove"
                      aria-label={`${groupIndex + 1}번 예산항목의 ${rowIndex + 1}번 산출 항목 삭제`}
                      onClick={() =>
                        field(
                          "items",
                          draft.items.filter((_, x) => x !== i),
                        )
                      }
                    >
                      <X size={17} />
                    </button>
                  </div>
                  );
                })}
              </div>
              <div className="prebudget-group-footer">
                <button type="button" className="prebudget-add-calculation" onClick={() => addCalculationRow(group.indices)}>
                  <Plus size={17} /> 이 사업에 산출 항목 추가
                </button>
                <span>묶음 합계 <strong>{groupTotal.toLocaleString()}원</strong></span>
              </div>
            </section>
            );
          })}
        </div>
        <button
          type="button"
          className="add-row"
          onClick={() =>
            field("items", [...draft.items, createBlankPrebudgetItem()])
          }
        >
          <Plus size={17} /> 새 예산항목 묶음 추가
        </button>
        <div className="total">
          <span>예산요구액 합계</span>
          <strong>{total.toLocaleString()}원</strong>
        </div>
      </section>
      {message && (
        <p className="prebudget-message" role="status">
          {message}
        </p>
      )}
      {issues.length > 0 && (
        <div className="prebudget-errors" role="alert">
          <b>자동점검 결과</b>
          <ul>
            {issues.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="actions">
        <button className="secondary" onClick={save}>
          임시저장
        </button>
        <button className="primary" onClick={generate}>
          <Download size={17} /> 자동점검 후 기안문 생성
        </button>
      </div>
      {document && (
        <section className="prebudget-preview-section" ref={previewRef}>
          <div className="prebudget-downloads">
            <div>
              <span>AUTO DRAFT</span>
              <h2>기안문 미리보기</h2>
              <p>성립전예산 요구내역을 엑셀 또는 한글(HWPX) 파일로 내려받을 수 있습니다.</p>
            </div>
            <div>
              <button
                onClick={() => navigator.clipboard.writeText(document.copyText)}
              >
                <Clipboard /> 전체 복사
              </button>
              <button
                disabled={workingExport === "hwpx"}
                onClick={() => void downloadHwpx()}
              >
                <FileText /> 한글(HWPX)
              </button>
              <button
                onClick={async () => {
                  const f = await exportPrebudgetExcel(document);
                  downloadBlob(f.blob, f.filename);
                }}
              >
                <Download /> 엑셀
              </button>
            </div>
          </div>
          <article className="prebudget-paper">
            <h1>{document.title}</h1>
            <pre>{document.bodyLines.join("\n")}</pre>
            <div className="prebudget-paper-table-wrap"><table><thead><tr>{document.budgetTable.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{document.budgetTable.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}<tr className="total-row"><td colSpan={6}>합계</td><td>{document.budgetTable.total}</td></tr></tbody></table></div>
          </article>
        </section>
      )}
    </div>
  );
}
