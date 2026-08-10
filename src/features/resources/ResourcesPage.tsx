import { Download, ExternalLink, FileSpreadsheet, FileText } from "lucide-react";
import { GUIDELINE_PDF_URL } from "../guidelines/GuidelinesPage";
import { downloadExpenditureTemplate } from "../guidelines/buildExpenditureTemplate";

type ResourcesPageProps = {
  onGuidelines: () => void;
};

export function ResourcesPage({ onGuidelines }: ResourcesPageProps) {
  return (
    <div className="content resources-page portal-workspace">
      <div className="page-title">
        <span>RESOURCES</span>
        <h1>자료실</h1>
        <p>학교 예산 업무에 필요한 지침과 현재 사용 중인 세출 요구자료 양식을 확인하세요.</p>
      </div>

      <div className="resource-card-grid">
        <section className="resource-card" aria-labelledby="resource-guideline-title">
          <span className="resource-card-icon resource-card-icon-blue" aria-hidden="true"><FileText /></span>
          <div>
            <span className="resource-card-type">GUIDELINE</span>
            <h2 id="resource-guideline-title">2026학년도 학교회계 예산편성 기본지침</h2>
            <p>지침 검색과 페이지별 미리보기는 예산지침 화면에서 이용할 수 있습니다.</p>
          </div>
          <div className="resource-card-actions">
            <button type="button" className="primary" onClick={onGuidelines}>학교예산 지침 열기</button>
            <a href={GUIDELINE_PDF_URL} target="_blank" rel="noreferrer"><ExternalLink size={17} /> 새 탭에서 열기</a>
            <a href={GUIDELINE_PDF_URL} download="2026학년도_학교회계_예산편성_기본지침.pdf"><Download size={17} /> PDF 내려받기</a>
          </div>
        </section>

        <section className="resource-card" aria-labelledby="resource-template-title">
          <span className="resource-card-icon resource-card-icon-teal" aria-hidden="true"><FileSpreadsheet /></span>
          <div>
            <span className="resource-card-type">TEMPLATE</span>
            <h2 id="resource-template-title">부서별 본예산 세출 요구자료 양식</h2>
            <p>본예산 편성·검토에 바로 올릴 수 있는 빈 양식입니다. 매크로 없이 XLS와 XLSX 형식을 제공합니다.</p>
          </div>
          <div className="resource-card-actions">
            <button type="button" onClick={() => downloadExpenditureTemplate("xls")}><Download size={17} /> 구형 Excel 양식(XLS) 다운로드</button>
            <button type="button" onClick={() => downloadExpenditureTemplate("xlsx")}><Download size={17} /> 일반 Excel 양식(XLSX) 다운로드</button>
          </div>
        </section>
      </div>
    </div>
  );
}
