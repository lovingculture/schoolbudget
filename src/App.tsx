import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  BookOpen,
  Calculator,
  ChevronRight,
  Download,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import {
  DEFAULT_ACCOUNT_CATEGORIES,
  PREBUDGET_BUSINESS_OPTIONS,
  DraftItem,
  calculateRequestedAmount,
  draftTotal,
  getAccountCategoryDescription,
  getDetailBusinesses,
} from "./domain/prebudget";
import { supabase } from "./lib/supabase";
import { ClosingPage } from "./features/closing/ClosingPage";
import { SupplementaryPage } from "./features/supplementary/SupplementaryPage";
import { BudgetAgendaPage } from "./features/budgetAgenda/BudgetAgendaPage";
import { GuidelinesPage } from "./features/guidelines/GuidelinesPage";
import { PrebudgetPage } from "./features/prebudget/PrebudgetPage";
import { MainBudgetPage } from "./features/mainBudget/MainBudgetPage";
import { PortalHeader, type PortalHeaderView } from "./components/PortalHeader";

export type View = PortalHeaderView;

const flow = [
  "예산지침 확인",
  "본예산 편성",
  "예산안건 설명서",
  "예산 확정·집행",
  "성립전예산·추경",
  "결산",
  "결산설명서",
];
const blankItem = (): DraftItem => ({
  id: crypto.randomUUID(),
  unitBusiness: "",
  business: "",
  detail: "",
  category: "일반수용비",
  description: "",
  unitPrice: 0,
  quantity: 0,
  count: 0,
  note: "",
});

type PortalProfile = { displayName: string; schoolName: string };
const KAKAO_AUTH_ENABLED = false;

export const kakaoOAuthOptions = (redirectTo: string) => ({
  redirectTo,
  scopes: "profile_nickname profile_image",
});

export default function App() {
  if (!KAKAO_AUTH_ENABLED) {
    return <Portal displayName="예산담당자" schoolName="학교예산 업무공간" />;
  }
  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async (nextUser: User | null) => {
      if (!active) return;
      setUser(nextUser);
      setProfile(null);
      if (!nextUser) {
        setLoading(false);
        return;
      }
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("school_id, display_name")
        .eq("user_id", nextUser.id)
        .maybeSingle();
      if (!active) return;
      if (profileError) {
        setError("회원 정보를 불러오지 못했습니다.");
        setLoading(false);
        return;
      }
      if (data) {
        const { data: school } = await supabase
          .from("schools")
          .select("name")
          .eq("id", data.school_id)
          .single();
        if (active)
          setProfile({
            displayName: data.display_name,
            schoolName: school?.name ?? "소속 학교",
          });
      }
      setLoading(false);
    };
    supabase.auth
      .getSession()
      .then(({ data }) => load(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => load(session?.user ?? null),
    );
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async () => {
    setBusy(true);
    setError("");
    const { error: loginError } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: kakaoOAuthOptions(window.location.origin),
    });
    if (loginError) {
      setError(
        "카카오 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
      setBusy(false);
    }
  };

  const createSchoolProfile = async (schoolName: string) => {
    if (!user) return;
    setBusy(true);
    setError("");
    const { data: school, error: schoolError } = await supabase
      .from("schools")
      .insert({ name: schoolName.trim(), region: "미지정" })
      .select("id, name")
      .single();
    if (schoolError || !school) {
      setError("학교를 등록하지 못했습니다. 학교명을 확인해 주세요.");
      setBusy(false);
      return;
    }
    const displayName =
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.preferred_username ||
      "학교 담당자";
    const { error: profileError } = await supabase.from("profiles").insert({
      user_id: user.id,
      school_id: school.id,
      display_name: displayName,
      role: "school_user",
    });
    if (profileError) {
      setError("회원 정보를 저장하지 못했습니다.");
      setBusy(false);
      return;
    }
    setProfile({ displayName, schoolName: school.name });
    setBusy(false);
  };

  if (loading)
    return (
      <div className="auth-loading">
        <span className="brandmark">예</span>
        <p>로그인 정보를 확인하고 있습니다.</p>
      </div>
    );
  if (!user) return <LoginPage onLogin={login} busy={busy} error={error} />;
  if (!profile) {
    const displayName =
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.preferred_username ||
      "학교 담당자";
    return (
      <SchoolSetupPage
        displayName={displayName}
        onSubmit={createSchoolProfile}
        busy={busy}
        error={error}
      />
    );
  }
  return (
    <Portal
      displayName={profile.displayName}
      schoolName={profile.schoolName}
      onLogout={() => supabase.auth.signOut()}
    />
  );
}

export function LoginPage({
  onLogin,
  busy,
  error,
}: {
  onLogin: () => void;
  busy: boolean;
  error: string;
}) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="brandmark">예</span>
          <div>
            <strong>학교예산 한눈에</strong>
            <small>예산업무 통합 포털</small>
          </div>
        </div>
        <span className="auth-eyebrow">SCHOOL BUDGET PORTAL</span>
        <h1>
          복잡한 학교 예산업무를
          <br />
          한곳에서 간편하게
        </h1>
        <p>
          예산지침 확인부터 성립전예산 요구서와
          <br />
          기안문 생성까지 안전하게 관리하세요.
        </p>
        <button
          className="kakao-button"
          aria-label="카카오로 시작하기"
          onClick={onLogin}
          disabled={busy}
        >
          <b aria-hidden="true">●</b>
          {busy ? "카카오로 이동 중…" : "카카오로 시작하기"}
        </button>
        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}
        <small className="auth-note">
          카카오 로그인 후 최초 1회 소속 학교를 등록합니다.
        </small>
      </section>
    </main>
  );
}

export function SchoolSetupPage({
  displayName,
  onSubmit,
  busy,
  error,
}: {
  displayName: string;
  onSubmit: (schoolName: string) => Promise<void>;
  busy: boolean;
  error: string;
}) {
  const [schoolName, setSchoolName] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (schoolName.trim()) void onSubmit(schoolName.trim());
  };
  return (
    <main className="auth-page">
      <section className="auth-card school-setup">
        <div className="auth-brand">
          <span className="brandmark">예</span>
          <div>
            <strong>학교예산 한눈에</strong>
            <small>최초 1회 학교 설정</small>
          </div>
        </div>
        <span className="auth-eyebrow">WELCOME</span>
        <h1>
          {displayName}님,
          <br />
          소속 학교를 알려주세요.
        </h1>
        <p>
          같은 학교 구성원끼리 예산자료를 함께 관리하고,
          <br />
          다른 학교의 자료와는 안전하게 분리됩니다.
        </p>
        <form onSubmit={submit}>
          <label htmlFor="school-name">학교명</label>
          <input
            id="school-name"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="예: 서울한빛초등학교"
            required
          />
          <button
            className="primary school-submit"
            disabled={busy || !schoolName.trim()}
          >
            {busy ? "등록 중…" : "학교 등록하고 시작하기"}
          </button>
        </form>
        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}
        <small className="auth-note">
          학교명은 문서와 학교별 자료 구분에 사용됩니다.
        </small>
      </section>
    </main>
  );
}

export function Portal({
  displayName,
  schoolName,
  onLogout,
}: {
  displayName: string;
  schoolName: string;
  onLogout?: () => void;
}) {
  const [view, setView] = useState<View>("home");
  const [items, setItems] = useState<DraftItem[]>(
    Array.from({ length: 5 }, blankItem),
  );
  const total = useMemo(() => draftTotal(items), [items]);
  const go = (next: View) => {
    setView(next);
  };

  const updateItem = (
    index: number,
    key: keyof DraftItem,
    value: string | number,
  ) => {
    setItems((current) =>
      current.map((item, i) => {
        if (i !== index) return item;
        if (key === "unitBusiness")
          return { ...item, unitBusiness: String(value), business: "" };
        return { ...item, [key]: value };
      }),
    );
  };

  return (
    <div className="app">
      <PortalHeader
        activeView={view}
        displayName={displayName}
        onNavigate={go}
        onLogout={onLogout}
        schoolName={schoolName}
      />
      <main className="main portal-main">
        {view === "home" && (
          <HomePage
            onCreate={() => go("prebudget")}
            onGuidelines={() => go("guidelines")}
          />
        )}
        {view === "guidelines" && <GuidelinesPage />}
        {view === "prebudget" && <PrebudgetPage initialSchoolName={schoolName} />}
        {view === "closing" && <ClosingPage />}
        {view === "agenda" && <BudgetAgendaPage />}
        {view === "supplementary" && <SupplementaryPage />}
        {view === "budget" && <MainBudgetPage />}
        {view === "settings" && <SettingsPage />}
        {view === "resources" && <ResourcesPage onGuidelines={() => go("guidelines")} />}
        {view === "videos" && <VideoGuideLanding />}
        {view === "search" && <PortalSearchPage />}
      </main>
    </div>
  );
}

function ResourcesPage({ onGuidelines }: { onGuidelines: () => void }) {
  return (
    <div className="content">
      <div className="page-title">
        <span>RESOURCES</span>
        <h1>자료실</h1>
        <p>학교예산 업무에 필요한 지침과 서식을 한곳에서 확인하세요.</p>
      </div>
      <section className="form-card">
        <h2>예산지침과 서식</h2>
        <p>현재 제공 중인 예산지침과 세출 요구자료 양식을 확인할 수 있습니다.</p>
        <button type="button" className="primary" onClick={onGuidelines}>
          학교예산 지침 열기
        </button>
      </section>
    </div>
  );
}

function VideoGuideLanding() {
  return (
    <div className="content">
      <div className="page-title">
        <span>VIDEO GUIDE</span>
        <h1>동영상 안내</h1>
        <p>예산 업무 절차를 동영상으로 안내합니다.</p>
      </div>
      <section className="form-card">
        <h2>동영상 자료</h2>
        <p>안내 동영상을 준비하고 있습니다.</p>
      </section>
    </div>
  );
}

function PortalSearchPage() {
  return (
    <div className="content">
      <div className="page-title">
        <span>SEARCH</span>
        <h1>통합검색</h1>
        <p>예산 지침과 업무 화면에서 필요한 정보를 빠르게 찾으세요.</p>
      </div>
      <section className="form-card">
        <label htmlFor="portal-search-query">통합검색어</label>
        <input
          id="portal-search-query"
          type="search"
          autoFocus
          placeholder="검색어를 입력하세요"
        />
      </section>
    </div>
  );
}

function HomePage({
  onCreate,
  onGuidelines,
}: {
  onCreate: () => void;
  onGuidelines: () => void;
}) {
  return (
    <div className="content home-page">
      <section className="hero">
        <div>
          <span className="eyebrow">
            <Sparkles size={16} /> 반복 업무는 줄이고, 검토는 더 정확하게
          </span>
          <h1>
            예산업무, 흐름부터
            <br />
            문서까지 한곳에서
          </h1>
          <p>
            지침을 확인하고 성립전예산 요구서를 작성하면
            <br />
            기안문과 Word·PDF가 자동으로 완성됩니다.
          </p>
          <button className="primary" onClick={onCreate}>
            성립전예산 새로 작성 <ChevronRight size={18} />
          </button>
        </div>
        <div className="hero-card">
          <span>오늘의 업무</span>
          <b>성립전예산 요구서</b>
          <ul>
            <li className="done">기본정보 입력</li>
            <li className="current">예산항목 작성</li>
            <li>자동점검</li>
            <li>기안문 생성</li>
          </ul>
          <small>최근 저장 8월 1일 오후 2:30</small>
        </div>
      </section>
      <section>
        <div className="section-title">
          <div>
            <span>WORKFLOW</span>
            <h2>예산업무 전체 흐름</h2>
          </div>
          <p>현재 단계와 다음 업무를 한눈에 확인하세요.</p>
        </div>
        <div className="flow">
          {flow.map((step, i) => (
            <div
              data-testid="budget-step"
              key={step}
              className={i === 4 ? "focus" : ""}
            >
              <i>{i + 1}</i>
              <span>{step}</span>
              {i < flow.length - 1 && <ChevronRight />}
            </div>
          ))}
        </div>
      </section>
      <section className="dashboard-grid">
        <article className="quick">
          <div className="card-head">
            <span className="icon coral">
              <Calculator />
            </span>
            <div>
              <b>성립전예산</b>
              <small>요구서부터 기안문까지</small>
            </div>
          </div>
          <div className="stats">
            <div>
              <b>3</b>
              <span>임시저장</span>
            </div>
            <div>
              <b>8</b>
              <span>작성완료</span>
            </div>
            <div>
              <b>6</b>
              <span>기안문 생성</span>
            </div>
          </div>
          <button onClick={onCreate}>
            새 문서 작성 <Plus size={17} />
          </button>
        </article>
        <article className="guideline-card">
          <div className="card-head">
            <span className="icon blue">
              <BookOpen />
            </span>
            <div>
              <b>최신 예산지침</b>
              <small>2026학년도 실제 예산편성 자료</small>
            </div>
          </div>
          <ul>
            <li>
              <span>2026학년도 학교회계 예산편성 기본지침</span>
              <time>216쪽</time>
            </li>
          </ul>
          <button className="text-button" onClick={onGuidelines}>
            지침 검색·미리보기 <ChevronRight size={16} />
          </button>
        </article>
      </section>
      <section className="recent">
        <div className="section-title">
          <div>
            <span>RECENT</span>
            <h2>최근 작업</h2>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>문서명</th>
              <th>부서</th>
              <th>금액</th>
              <th>상태</th>
              <th>최종 수정</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>안전인력 봉사비 성립전예산</td>
              <td>체육안전교육부</td>
              <td>5,000,000원</td>
              <td>
                <mark>작성 완료</mark>
              </td>
              <td>오늘 14:30 · 김담당</td>
            </tr>
            <tr>
              <td>과학실 현대화 사업비</td>
              <td>과학정보부</td>
              <td>12,500,000원</td>
              <td>
                <mark className="draft">임시저장</mark>
              </td>
              <td>어제 16:12 · 이주무</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Prebudget({
  items,
  total,
  updateItem,
  addItem,
  removeItem,
}: {
  items: DraftItem[];
  total: number;
  updateItem: (i: number, k: keyof DraftItem, v: string | number) => void;
  addItem: () => void;
  removeItem: (i: number) => void;
}) {
  return (
    <div className="content">
      <div className="page-title">
        <span>성립전예산</span>
        <h1>성립전예산 요구서 작성</h1>
        <p>
          입력한 내용으로 K-에듀파인 복사용 기안문과 파일을 자동 생성합니다.
        </p>
      </div>
      <div className="steps">
        <b className="active">1 기본정보</b>
        <b className="active">2 예산항목</b>
        <b>3 자동점검</b>
        <b>4 미리보기·생성</b>
      </div>
      <section className="form-card">
        <h2>기본정보</h2>
        <div className="form-grid">
          <label>
            회계연도
            <input defaultValue="2026" />
          </label>
          <label>
            재원구분
            <select defaultValue="목적사업비(교육청)">
              <option>보조금(구청)</option>
              <option>목적사업비(교육청)</option>
              <option>수익자부담경비(학부모)</option>
            </select>
          </label>
          <label className="wide">
            문서 제목
            <input defaultValue="안전인력 봉사비 성립전예산" />
          </label>
          <label>
            부서명
            <input defaultValue="체육안전교육부" />
          </label>
          <label>
            요구자
            <input defaultValue="김담당" />
          </label>
          <label className="wide">
            관련 공문
            <input placeholder="예: 교육지원과-1234(2026. 8. 1.)" />
          </label>
        </div>
      </section>
      <section className="form-card">
        <div className="card-title-row">
          <div>
            <h2>예산항목</h2>
            <p>산출기초를 입력하면 요구금액이 자동 계산됩니다.</p>
          </div>
          <button className="secondary" onClick={addItem}>
            <Plus size={16} /> 항목 추가
          </button>
        </div>
        <div className="item-list">
          {items.map((item, i) => (
            <div className="budget-item" key={item.id}>
              <div className="item-number">{i + 1}</div>
              <div className="item-fields">
                <label>
                  단위사업
                  <select
                    value={item.unitBusiness ?? ""}
                    onChange={(e) =>
                      updateItem(i, "unitBusiness", e.target.value)
                    }
                  >
                    <option value="">선택하세요</option>
                    {PREBUDGET_BUSINESS_OPTIONS.map(([unit]) => (
                      <option key={unit}>{unit}</option>
                    ))}
                  </select>
                </label>
                <label>
                  세부사업
                  <select
                    value={item.business ?? ""}
                    disabled={!item.unitBusiness}
                    onChange={(e) => updateItem(i, "business", e.target.value)}
                  >
                    <option value="">
                      {item.unitBusiness
                        ? "선택하세요"
                        : "단위사업을 먼저 선택하세요"}
                    </option>
                    {getDetailBusinesses(item.unitBusiness).map((business) => (
                      <option key={business}>{business}</option>
                    ))}
                  </select>
                </label>
                <label>
                  세부항목
                  <input
                    value={item.detail}
                    onChange={(e) => updateItem(i, "detail", e.target.value)}
                    placeholder="세부항목"
                  />
                </label>
                <div className="category-field">
                  <label>
                    원가통계비목
                    <select
                      value={item.category}
                      onChange={(e) => updateItem(i, "category", e.target.value)}
                    >
                      {DEFAULT_ACCOUNT_CATEGORIES.map(([name]) => (
                        <option key={name}>{name}</option>
                      ))}
                    </select>
                  </label>
                  <aside className="category-help" aria-label="비목 설명">
                    <b>비목 설명</b>
                    <p>{getAccountCategoryDescription(item.category)}</p>
                  </aside>
                </div>
                <label className="description">
                  산출내역
                  <input
                    value={item.description}
                    onChange={(e) =>
                      updateItem(i, "description", e.target.value)
                    }
                    placeholder="예: 안전인력 봉사비"
                  />
                </label>
                <div className="formula">
                  <label>
                    단가
                    <input
                      aria-label="단가"
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(i, "unitPrice", Number(e.target.value))
                      }
                    />
                  </label>
                  <b>×</b>
                  <label>
                    수량
                    <input
                      aria-label="수량"
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(i, "quantity", Number(e.target.value))
                      }
                    />
                  </label>
                  <b>×</b>
                  <label>
                    횟수
                    <input
                      aria-label="횟수"
                      type="number"
                      value={item.count}
                      onChange={(e) =>
                        updateItem(i, "count", Number(e.target.value))
                      }
                    />
                  </label>
                  <b>=</b>
                  <output>
                    {calculateRequestedAmount(item).toLocaleString()}원
                  </output>
                </div>
              </div>
              <button
                className="remove"
                aria-label={`${i + 1}번 항목 삭제`}
                onClick={() => removeItem(i)}
              >
                <X size={17} />
              </button>
            </div>
          ))}
        </div>
        <button className="add-row" onClick={addItem}>
          <Plus size={17} /> 예산항목 추가
        </button>
        <div className="total">
          <span>예산요구액 합계</span>
          <strong>{total.toLocaleString()}원</strong>
        </div>
      </section>
      <div className="actions">
        <button className="secondary">임시저장</button>
        <button className="primary">
          <Download size={17} /> 자동점검 후 기안문 생성
        </button>
      </div>
    </div>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="content empty">
      <span className="icon blue">
        <Sparkles />
      </span>
      <h1>{title}</h1>
      <p>1차 성립전예산 자동화 완료 후 공식 양식을 연결할 예정입니다.</p>
      <mark>준비 중</mark>
    </div>
  );
}
function SettingsPage() {
  return (
    <div className="content">
      <div className="page-title">
        <span>SCHOOL</span>
        <h1>학교 설정</h1>
        <p>문서에 자동으로 입력될 학교 기본정보를 관리합니다.</p>
      </div>
      <section className="form-card">
        <div className="form-grid">
          <label className="wide">
            학교명
            <input defaultValue="서울한빛초등학교" />
          </label>
          <label className="wide">
            주소
            <input defaultValue="서울특별시 성동구 한빛로 00" />
          </label>
          <label>
            대표전화
            <input defaultValue="02-0000-0000" />
          </label>
          <label>
            이메일
            <input defaultValue="school@sen.go.kr" />
          </label>
        </div>
      </section>
    </div>
  );
}
