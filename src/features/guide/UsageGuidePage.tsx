import {
  ArrowRight,
  BookOpen,
  ChartNoAxesCombined,
  ClipboardList,
  Download,
  FileText,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import type { View } from "../../App";
import "./usageGuide.css";

type UsageGuidePageProps = {
  onNavigate: (view: View) => void;
};

const workflows: Array<{
  view: View;
  title: string;
  description: string;
  buttonLabel: string;
  icon: typeof BookOpen;
}> = [
  {
    view: "resources",
    title: "예산 지침과 자료 찾기",
    description: "예산편성 기본지침을 검색하고 필요한 PDF·엑셀 업무자료를 내려받으세요.",
    buttonLabel: "예산 자료실로 이동",
    icon: BookOpen,
  },
  {
    view: "prebudget",
    title: "성립전예산 요구서 작성",
    description: "재원 유형과 유사 예시를 확인한 뒤 사업정보와 산출내역을 입력해 요구서를 완성하세요.",
    buttonLabel: "성립전예산 작성으로 이동",
    icon: FileText,
  },
  {
    view: "budget",
    title: "본예산 자료 확인",
    description: "부서별 예산 요구자료를 모으고 편성 내역을 검토해 본예산 작업을 진행하세요.",
    buttonLabel: "본예산으로 이동",
    icon: WalletCards,
  },
  {
    view: "agenda",
    title: "예산안건 설명서 만들기",
    description: "세입·세출 예산총괄표를 불러와 학교운영위원회용 예산안건 설명서를 작성하세요.",
    buttonLabel: "예산안건 설명서로 이동",
    icon: ClipboardList,
  },
  {
    view: "closing",
    title: "결산 설명서 만들기",
    description: "결산 총괄표를 바탕으로 주요 증감과 사업 내용을 정리한 결산 설명서를 만드세요.",
    buttonLabel: "결산 설명서로 이동",
    icon: ReceiptText,
  },
  {
    view: "supplementary",
    title: "추경예산자료 만들기",
    description: "집행실적 파일을 불러와 감액 가능액을 살펴보고 추경 검토자료를 정리하세요.",
    buttonLabel: "추경예산자료로 이동",
    icon: ChartNoAxesCombined,
  },
];

export function UsageGuidePage({ onNavigate }: UsageGuidePageProps) {
  return (
    <div className="content portal-workspace usage-guide-page">
      <section className="usage-guide-hero" aria-labelledby="usage-guide-title">
        <div>
          <span>GUIDE</span>
          <h1 id="usage-guide-title">학교예산 한눈에 이용 안내</h1>
          <p>처음 방문하셨다면 아래 순서대로 필요한 업무를 선택해 보세요. 각 화면에서 안내에 따라 입력하면 문서와 검토자료를 만들 수 있습니다.</p>
        </div>
        <img src="/characters/cards/main-budget-good.png" alt="이용 방법을 안내하는 서울시교육청 캐릭터" />
      </section>

      <section className="usage-guide-section" aria-labelledby="workflow-guide-title">
        <div className="usage-guide-heading">
          <span>STEP BY STEP</span>
          <h2 id="workflow-guide-title">업무별 이용 방법</h2>
          <p>원하는 업무만 골라 바로 시작할 수 있습니다.</p>
        </div>
        <div className="usage-guide-grid">
          {workflows.map(({ view, title, description, buttonLabel, icon: Icon }, index) => (
            <article key={view}>
              <div className="usage-guide-card-top">
                <span className="usage-guide-step">{String(index + 1).padStart(2, "0")}</span>
                <span className="usage-guide-icon"><Icon aria-hidden="true" /></span>
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
              <button type="button" aria-label={buttonLabel} onClick={() => onNavigate(view)}>
                바로가기 <ArrowRight aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>
      </section>

      <div className="usage-guide-info-grid">
        <section className="usage-guide-info" aria-labelledby="download-guide-title">
          <span className="usage-guide-info-icon"><Download aria-hidden="true" /></span>
          <div>
            <h2 id="download-guide-title">파일 내려받기 안내</h2>
            <ul>
              <li>화면에 입력한 학교의 실제 사업명·금액·산출근거를 다시 확인하세요.</li>
              <li>엑셀·한글·Word·PDF 중 화면에서 제공하는 형식으로 내려받을 수 있습니다.</li>
              <li>내려받은 파일은 최종 결재 전에 교부공문과 학교 기준에 맞는지 확인하세요.</li>
            </ul>
          </div>
        </section>

        <section className="usage-guide-security" aria-labelledby="security-guide-title">
          <span className="usage-guide-info-icon"><ShieldCheck aria-hidden="true" /></span>
          <div>
            <h2 id="security-guide-title">학교 자료는 안전하게</h2>
            <p>선택한 파일은 이 브라우저에서만 처리되며 서버에 업로드하거나 저장하지 않습니다.</p>
            <small>공용 컴퓨터에서는 내려받은 파일을 사용 후 반드시 정리해 주세요.</small>
          </div>
        </section>
      </div>

      <section className="usage-guide-faq" aria-labelledby="usage-guide-faq-title">
        <div className="usage-guide-heading">
          <span>FAQ</span>
          <h2 id="usage-guide-faq-title">자주 묻는 질문</h2>
        </div>
        <details>
          <summary>예시는 그대로 복사해서 사용해도 되나요?</summary>
          <p>예시는 작성 방향을 보여주는 참고자료입니다. 교부공문, 실제 사업계획, 단가와 인원·횟수를 확인하여 학교 상황에 맞게 수정하세요.</p>
        </details>
        <details>
          <summary>입력한 금액은 어떤 단위로 편성되나요?</summary>
          <p>성립전예산 요구금액은 천 원 단위로 편성될 수 있도록 계산 결과를 올림하여 반영합니다. 내려받기 전에 산출식과 최종 요구금액을 함께 확인하세요.</p>
        </details>
        <details>
          <summary>파일이 서버에 저장되나요?</summary>
          <p>아니요. 선택한 파일은 현재 브라우저 안에서만 처리하며 사이트 서버에 업로드하거나 저장하지 않습니다.</p>
        </details>
      </section>
    </div>
  );
}
