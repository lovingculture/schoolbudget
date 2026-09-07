import { useMemo, useState } from "react";
import { ExternalLink, Link2, Search } from "lucide-react";
import "./referenceSites.css";

export type ReferenceSiteCategory = "교육청" | "학교회계" | "업무지원" | "기타";

export type ReferenceSite = {
  id: string;
  title: string;
  category: ReferenceSiteCategory;
  description: string;
  url: string;
};

export const REFERENCE_SITES: ReferenceSite[] = [
  {
    id: "sen-purpose-budget-settlement-system",
    title: "서울시교육청 목적사업비 정산시스템",
    category: "교육청",
    description: "목적사업비 정산보고 등록, 수정요청 내역 및 관련 자료를 확인하는 서울특별시교육청 업무 시스템입니다.",
    url: "https://mokjeok.sen.go.kr/",
  },
  {
    id: "sen-budget-office-board",
    title: "서울시교육청 예산담당관 부서업무방",
    category: "교육청",
    description: "학교회계 예산편성 기본지침, 연수자료 및 예산 관련 업무자료를 확인하는 서울특별시교육청 게시판입니다.",
    url: "https://buseo.sen.go.kr/buseo/bu05/user/bbs/BD_selectBbsList.do?q_bbsSn=1199",
  },
  {
    id: "sen-current-autonomous-regulations",
    title: "서울시교육청 자치법규 검색",
    category: "교육청",
    description: "서울특별시교육청의 현행 조례·규칙·훈령을 검색하고 관련 법규 내용을 확인하는 공식 사이트입니다.",
    url: "https://www.sen.go.kr/user/bbs/nowlaw.do",
  },
  {
    id: "seoul-education-portal-ssem-linked-resources",
    title: "서울교육포털(SSEM)",
    category: "교육청",
    description: "서울시교육청 연구정보원에서 만든 사이트로, 서울시교육청 홈페이지와 연동되어 자동으로 업데이트되는 연계자료실을 포함합니다.",
    url: "https://www.ssem.or.kr/api/intergrated/tutHpDta/metaSearch/apiBbs/apiBbsList.do?bbsSn=1216",
  },
  {
    id: "sen-electronic-library",
    title: "서울시교육청 전자도서관",
    category: "교육청",
    description: "전자책·오디오북·온라인 강좌 등 서울시교육청의 디지털 자료를 이용할 수 있는 전자도서관입니다.",
    url: "https://e-lib.sen.go.kr/",
  },
  {
    id: "sen-contract-guide",
    title: "서울시교육청 계약길잡이",
    category: "교육청",
    description: "서울시교육청의 계약 업무 지침과 관련 자료를 확인할 수 있습니다.",
    url: "https://contract.sen.go.kr/",
  },
  {
    id: "sen-open-finance",
    title: "서울시교육청 열린 재정",
    category: "교육청",
    description: "서울교육 재정정보와 예산·결산 자료를 확인할 수 있습니다.",
    url: "https://open.sen.go.kr/fus/MI000000000000000509/html/cont0010v.do",
  },
  {
    id: "sen-school",
    title: "센스쿨",
    category: "업무지원",
    description: "AI 맞춤형 교수·학습 플랫폼으로, 서울시교육청 교직원은 로그인하여 센지피티, 미리캔버스, 캔바 등 교육활동에 필요한 사이트를 이용할 수 있습니다.",
    url: "https://senedu.kr/",
  },
  {
    id: "government-employees-pension-service",
    title: "공무원연금공단",
    category: "업무지원",
    description: "공무원 연금·퇴직급여·재해보상·복지서비스와 관련 민원 정보를 확인할 수 있는 공식 사이트입니다.",
    url: "https://www.geps.or.kr/",
  },
  {
    id: "sen-evpn",
    title: "서울시교육청 원격업무지원시스템(EVPN)",
    category: "업무지원",
    description: "서울시교육청 교직원이 외부에서 업무포털·나이스·K-에듀파인 등에 안전하게 접속할 수 있는 원격업무지원시스템입니다.",
    url: "https://evpn.sen.go.kr/",
  },
];

const CATEGORIES = ["전체", "교육청", "학교회계", "업무지원", "기타"] as const;

export function ReferenceSitesPage({ sites = REFERENCE_SITES }: { sites?: ReferenceSite[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("전체");
  const filtered = useMemo(() => {
    const token = query.trim().toLocaleLowerCase("ko-KR");
    return sites.filter((site) => {
      const categoryMatches = category === "전체" || site.category === category;
      const textMatches = !token || [site.title, site.description, site.category]
        .some((value) => value.toLocaleLowerCase("ko-KR").includes(token));
      return categoryMatches && textMatches;
    });
  }, [category, query, sites]);

  return <div className="content reference-sites-page">
    <section className="reference-sites-hero" aria-labelledby="reference-sites-title">
      <div>
        <span>USEFUL LINKS</span>
        <h1 id="reference-sites-title">참고사이트</h1>
        <p>학교예산 업무에 도움이 되는 교육청·학교회계·업무지원 사이트를 한곳에서 확인하세요.</p>
      </div>
      <span className="reference-sites-hero-icon" aria-hidden="true"><Link2 /></span>
    </section>

    <section className="reference-sites-tools" aria-label="참고사이트 검색 및 분류">
      <label><Search aria-hidden="true"/><input type="search" aria-label="참고사이트 검색" placeholder="사이트명이나 설명을 검색하세요" value={query} onChange={(event) => setQuery(event.target.value)}/></label>
      <div role="group" aria-label="참고사이트 분야">{CATEGORIES.map((item) => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
    </section>

    {filtered.length ? <section className="reference-sites-grid" aria-label="참고사이트 목록">
      {filtered.map((site) => (
        <article key={site.id}>
          <small>{site.category}</small>
          <h2>{site.title}</h2>
          <p>{site.description}</p>
          <a href={site.url} target="_blank" rel="noreferrer" aria-label={`${site.title} 바로가기`}>사이트 바로가기 <ExternalLink aria-hidden="true"/></a>
        </article>
      ))}
    </section> : <section className="reference-sites-empty" aria-live="polite">
      <span aria-hidden="true"><Link2 /></span>
      <h2>등록된 참고사이트가 없습니다.</h2>
      <p>링크를 알려주시면 확인 후 게시판에 반영합니다.</p>
    </section>}

  </div>;
}
