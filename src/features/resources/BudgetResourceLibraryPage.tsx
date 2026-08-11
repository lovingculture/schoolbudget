import { Download } from "lucide-react";
import { downloadExpenditureTemplate } from "../guidelines/buildExpenditureTemplate";
import { GuidelineSearchPanel } from "../guidelines/GuidelineSearchPanel";
import "./budgetResourceLibrary.css";

type Props = { isAdmin: boolean; userId: string };

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

export function BudgetResourceLibraryPage({ isAdmin, userId: _userId }: Props) {
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
      {isAdmin && (
        <button className="resource-library-register" type="button">
          자료 등록
        </button>
      )}
    </div>
  );
}
