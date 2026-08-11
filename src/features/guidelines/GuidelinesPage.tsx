import { Download } from "lucide-react";
import { downloadExpenditureTemplate } from "./buildExpenditureTemplate";
import { GUIDELINE_PDF_URL, GUIDELINE_TITLE } from "./guidelineConstants";
import { GuidelineSearchPanel } from "./GuidelineSearchPanel";
import "./guidelines.css";

export { GUIDELINE_PDF_URL, GUIDELINE_TITLE } from "./guidelineConstants";

export function GuidelinesPage() {
  return <div className="content guideline-page portal-workspace"><div className="page-title"><span>COMMON GUIDE</span><h1>예산지침</h1><p>2026학년도 학교회계 예산편성 기본지침을 검색하고 해당 페이지를 바로 확인하세요.</p></div><GuidelineSearchPanel searchLabel="지침 검색" /><article className="guideline-document-card guideline-template-card"><span className="guideline-file-icon"><Download aria-hidden="true" /></span><div className="guideline-document-info"><h2>부서별 본예산 세출 요구자료 양식</h2><p>부서별 세출자료 수합용 · 매크로 없음 · XLS·XLSX 호환</p></div><div className="guideline-document-actions"><button type="button" onClick={() => downloadExpenditureTemplate("xls")}><Download size={18} /> 구형 Excel 양식(XLS) 다운로드</button><button type="button" onClick={() => downloadExpenditureTemplate("xlsx")}><Download size={18} /> 일반 Excel 양식(XLSX) 다운로드</button></div></article></div>;
}
