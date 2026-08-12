import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileText, Pencil, Trash2 } from "lucide-react";
import { downloadExpenditureTemplate } from "../guidelines/buildExpenditureTemplate";
import { GuidelineSearchPanel } from "../guidelines/GuidelineSearchPanel";
import { supabase } from "../../lib/supabase";
import { ResourceAdminDialog } from "./ResourceAdminDialog";
import { createResourceRepository, type ResourceRepository, type ResourceRepositoryClient } from "./resourceRepository";
import type { BudgetResource, BudgetResourceInput } from "./resourceTypes";
import "./budgetResourceLibrary.css";

type Props = { isAdmin: boolean; userId: string; repository?: ResourceRepository };

function StaticResourceCards() {
  return (
    <section className="resource-library-cards" aria-label="다운로드 자료">
      <article className="guideline-document-card guideline-template-card">
        <span className="guideline-file-icon">
          <Download aria-hidden="true" />
        </span>
        <div className="guideline-document-info">
          <h2>부서별 본예산 세출 요구자료 양식</h2>
          <p>부서별 세출자료 수합용 · 매크로 없음 · XLS·XLSX 호환</p>
        </div>
        <div className="guideline-document-actions">
          <button type="button" onClick={() => downloadExpenditureTemplate("xls")}>
            <Download size={18} /> 구형 Excel 양식(XLS) 다운로드
          </button>
          <button type="button" onClick={() => downloadExpenditureTemplate("xlsx")}>
            <Download size={18} /> 일반 Excel 양식(XLSX) 다운로드
          </button>
        </div>
      </article>
    </section>
  );
}

export function BudgetResourceLibraryPage({ isAdmin, userId, repository }: Props) {
  const repo = useMemo(() => repository ?? createResourceRepository(supabase as unknown as ResourceRepositoryClient), [repository]);
  const [resources, setResources] = useState<BudgetResource[]>([]);
  const [editing, setEditing] = useState<BudgetResource | "create" | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setResources(await repo.listPublic());
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "자료를 불러오지 못했습니다.");
    }
  }, [repo]);

  useEffect(() => { void load(); }, [load]);

  const save = async (input: BudgetResourceInput, file?: File) => {
    if (editing === "create") await repo.create(input, file as File, userId);
    else if (editing) await repo.update(editing.id, input, file);
    setEditing(null);
    await load();
  };

  const remove = async (resource: BudgetResource) => {
    if (!window.confirm(`'${resource.title}' 자료를 삭제하시겠습니까?`)) return;
    try {
      await repo.remove(resource);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "자료를 삭제하지 못했습니다.");
    }
  };

  const download = async (resource: BudgetResource) => {
    try { await repo.download(resource); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "파일을 내려받지 못했습니다."); }
  };

  return (
    <div className="content budget-resource-library portal-workspace">
      <section className="resource-library-hero" aria-labelledby="resource-library-title">
        <div>
          <span>BUDGET RESOURCE LIBRARY</span>
          <h1 id="resource-library-title">예산 자료실</h1>
          <p>예산 지침을 검색하고 필요한 업무 양식을 한곳에서 확인하세요.</p>
        </div>
        <img
          src="/characters/cards/main-budget-good.png"
          alt="자료를 안내하는 서울교육청 캐릭터"
        />
      </section>
      <GuidelineSearchPanel />
      <StaticResourceCards />
      {resources.length > 0 && (
        <section className="resource-library-cards resource-dynamic-list" aria-label="등록 자료">
          {resources.map((resource) => (
            <article className="guideline-document-card" key={resource.id}>
              <span className="guideline-file-icon"><FileText aria-hidden="true" /></span>
              <div className="guideline-document-info">
                <h2>{resource.title}</h2>
                <p>{resource.schoolYear}학년도 · {resource.originalFilename}</p>
                {resource.description && <p>{resource.description}</p>}
              </div>
              <div className="guideline-document-actions">
                <button type="button" aria-label={`다운로드: ${resource.title}`} onClick={() => void download(resource)}><Download size={18} /> 다운로드</button>
                {isAdmin && <>
                  <button type="button" aria-label={`자료 수정: ${resource.title}`} onClick={() => setEditing(resource)}><Pencil size={18} /> 수정</button>
                  <button type="button" aria-label={`자료 삭제: ${resource.title}`} onClick={() => void remove(resource)}><Trash2 size={18} /> 삭제</button>
                </>}
              </div>
            </article>
          ))}
        </section>
      )}
      {error && <p role="alert" className="resource-library-error">{error}</p>}
      {isAdmin && (
        <button className="resource-library-register" type="button" onClick={() => setEditing("create")}>
          자료 등록
        </button>
      )}
      {editing && (
        <ResourceAdminDialog
          mode={editing === "create" ? "create" : "edit"}
          resource={editing === "create" ? undefined : editing}
          onSubmit={save}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
