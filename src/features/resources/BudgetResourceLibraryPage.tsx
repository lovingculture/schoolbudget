import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileText, Pencil, Trash2 } from "lucide-react";
import { downloadExpenditureTemplate } from "../guidelines/buildExpenditureTemplate";
import { GuidelineSearchPanel } from "../guidelines/GuidelineSearchPanel";
import { supabase } from "../../lib/supabase";
import { ResourceAdminDialog } from "./ResourceAdminDialog";
import { createResourceRepository, type ResourceRepository, type ResourceRepositoryClient } from "./resourceRepository";
import type { BudgetResource, BudgetResourceInput, ResourceCategory } from "./resourceTypes";
import "./budgetResourceLibrary.css";

type Props = {
  isAdmin: boolean;
  userId: string;
  repository?: ResourceRepository;
  onAdminLogin?: () => void;
};

const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  guide: "지침",
  template: "양식",
  reference: "참고자료",
};

function fileFormat(filename: string) {
  return filename.split(".").at(-1)?.toUpperCase() || "파일";
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes % 1024 === 0 ? 0 : 1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
      <article className="guideline-document-card guideline-template-card">
        <span className="guideline-file-icon">
          <Download aria-hidden="true" />
        </span>
        <div className="guideline-document-info">
          <h2>집행실적 정리(추경예산 만들기)용 엑셀파일</h2>
          <p>집행실적 정리 및 추경예산 검토자료 작성용 · 매크로 포함 · 2026학년도</p>
        </div>
        <div className="guideline-document-actions">
          <a
            href="/resources/expenditure-performance-budget-revision.xlsm"
            download="집행실적정리용엑셀 확정본.xlsm"
          >
            <Download size={18} /> 집행실적 정리(추경예산 만들기)용 엑셀파일 다운로드
          </a>
        </div>
      </article>
    </section>
  );
}

export function BudgetResourceLibraryPage({ isAdmin, userId, repository, onAdminLogin }: Props) {
  const repo = useMemo(() => repository ?? createResourceRepository(supabase as unknown as ResourceRepositoryClient), [repository]);
  const [resources, setResources] = useState<BudgetResource[]>([]);
  const [editing, setEditing] = useState<BudgetResource | "create" | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ResourceCategory | "all">("all");
  const [schoolYear, setSchoolYear] = useState("all");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setResources(await (isAdmin ? repo.listAll() : repo.listPublic()));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "자료를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, repo]);

  useEffect(() => { void load(); }, [load]);

  const schoolYears = useMemo(
    () => [...new Set(resources.map((resource) => resource.schoolYear))].sort((a, b) => b - a),
    [resources],
  );
  const filteredResources = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko");
    return resources.filter((resource) => {
      const matchesQuery = !normalizedQuery
        || `${resource.title} ${resource.description}`.toLocaleLowerCase("ko").includes(normalizedQuery);
      return matchesQuery
        && (category === "all" || resource.category === category)
        && (schoolYear === "all" || resource.schoolYear === Number(schoolYear));
    });
  }, [category, query, resources, schoolYear]);

  const save = async (input: BudgetResourceInput, file?: File) => {
    const wasCreating = editing === "create";
    if (wasCreating) await repo.create(input, file as File, userId);
    else if (editing) await repo.update(editing.id, input, file);
    setEditing(null);
    await load();
    setStatus(wasCreating ? "자료를 등록했습니다." : "자료를 수정했습니다.");
  };

  const remove = async (resource: BudgetResource) => {
    if (!window.confirm(`'${resource.title}' 자료를 삭제하시겠습니까?`)) return;
    try {
      await repo.remove(resource);
      await load();
      setStatus("자료를 삭제했습니다.");
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
      <GuidelineSearchPanel searchLabel="예산편성지침 검색" />
      <StaticResourceCards />
      {loading && <p role="status" aria-live="polite">자료 목록을 불러오는 중입니다.</p>}
      {resources.length > 0 && (
        <section className="resource-library-dynamic" aria-labelledby="registered-resources-title">
          <h2 id="registered-resources-title">등록 자료</h2>
          <div className="resource-library-filters" role="search" aria-label="등록 자료 검색 및 필터">
            <label>
              <span>자료 검색</span>
              <input type="search" aria-label="등록 자료 검색" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목 또는 설명을 검색하세요" />
            </label>
            <label>
              <span>분류</span>
              <select aria-label="자료 분류" value={category} onChange={(event) => setCategory(event.target.value as ResourceCategory | "all")}>
                <option value="all">전체 분류</option>
                <option value="guide">지침</option>
                <option value="template">양식</option>
                <option value="reference">참고자료</option>
              </select>
            </label>
            <label>
              <span>학년도</span>
              <select aria-label="학년도" value={schoolYear} onChange={(event) => setSchoolYear(event.target.value)}>
                <option value="all">전체 학년도</option>
                {schoolYears.map((year) => <option key={year} value={year}>{year}학년도</option>)}
              </select>
            </label>
          </div>
          {filteredResources.length > 0 && <div className="resource-library-cards resource-dynamic-list">
          {filteredResources.map((resource) => (
            <article className="guideline-document-card" key={resource.id}>
              <span className="guideline-file-icon"><FileText aria-hidden="true" /></span>
              <div className="guideline-document-info">
                <h2>{resource.title}</h2>
                <p className="resource-library-metadata">
                  <span>{CATEGORY_LABELS[resource.category]}</span>
                  <span>{resource.schoolYear}학년도</span>
                  <span>{fileFormat(resource.originalFilename)}</span>
                  <span>{new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(resource.createdAt))}</span>
                  <span>{fileSize(resource.sizeBytes)}</span>
                </p>
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
          </div>}
          {filteredResources.length === 0 && <p role="status" className="resource-library-empty">조건에 맞는 등록 자료가 없습니다.</p>}
        </section>
      )}
      {!loading && resources.length === 0 && <p className="resource-library-empty">등록된 자료가 없습니다.</p>}
      {error && <p role="alert" className="resource-library-error">{error}</p>}
      {!loading && status && <p role="status" aria-live="polite" className="resource-library-status">{status}</p>}
      {isAdmin && (
        <button className="resource-library-register" type="button" onClick={() => setEditing("create")}>
          자료 등록
        </button>
      )}
      {!isAdmin && onAdminLogin && (
        <button className="resource-library-register" type="button" onClick={onAdminLogin}>
          관리자 로그인
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
