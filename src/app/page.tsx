import Link from "next/link";
import { CHECKLIST_TEMPLATES } from "@/lib/checklist/templates";

const SEMI = CHECKLIST_TEMPLATES.filter((t) => t.cadence === "SEMIANNUAL");

const STEPS = [
  { t: "반기마다 할 일이 자동으로", d: "1월과 7월에 이번 반기 점검 항목이 만들어지고, 마감 30일·7일·1일 전에 담당자와 경영책임자에게 메일이 갑니다." },
  { t: "항목별로 체크하고 증빙을 붙이기", d: "이행·일부 이행·미이행·해당 없음을 고르고 교육 일지, 회의록, 사진을 올립니다. 누가 언제 했는지는 자동으로 남습니다." },
  { t: "법이 바뀌면 다시 확인할 항목 표시", d: "산업안전보건법·중대재해처벌법이 개정되면 영향을 받는 점검 항목에 표시해 드립니다. 조문 단위 신·구 비교로 바로 연결됩니다." },
  { t: "버튼 하나로 보고서, 5년 보관", d: "경영책임자 확인까지 담긴 점검 보고서를 PDF·Word로 받습니다. 모든 회차가 보관함에 5년간 남습니다." },
];

const FAQ = [
  { q: "법률 자문 서비스인가요?", a: "아닙니다. 시행령이 정한 점검 항목을 할 일로 정리하고, 회사가 한 점검을 기록·보관하도록 돕는 도구입니다. 법적 판단이 필요하면 노무사·변호사와 상의하세요." },
  { q: "엑셀로 해도 되지 않나요?", a: "됩니다. 그래서 같은 항목을 엑셀 점검표로도 내려받을 수 있게 했습니다. 다만 반기마다 마감을 챙기고, 증빙 파일을 모으고, 담당자가 바뀌어도 기록을 이어가고, 5년치를 꺼내 보는 일은 엑셀로 하기 번거로워서 이 앱을 만들었습니다." },
  { q: "직원이 5명 미만이에요.", a: "상시근로자 5명 미만 사업장은 중대재해처벌법 적용 대상이 아닙니다. 안전 점검 기록용으로는 쓸 수 있습니다." },
  { q: "자료는 안전하게 보관되나요?", a: "증빙 파일은 비공개 저장소에 보관되고, 같은 회사 구성원만 내려받을 수 있습니다. 서버는 서울 리전에 있습니다." },
];

export default function Landing() {
  return (
    <div>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <span className="font-semibold">중대재해 점검노트</span>
          <nav className="ml-auto flex items-center gap-1 text-sm">
            <a href="#how" className="btn-ghost hidden sm:inline-flex">기능</a>
            <Link href="/login" className="btn-secondary">로그인</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-4 pb-16 pt-14 sm:pt-20">
          <p className="text-sm font-medium text-brand">중대재해처벌법 시행령 제4조·제5조 · 반기 1회 이상 점검</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight sm:text-[42px] sm:leading-[1.2]">
            6개월마다 돌아오는 중대재해법 점검,
            <br />
            기록부터 보고서까지 한 곳에서.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            시행령이 반기마다 점검하라고 정한 항목을 할 일로 만들어 드립니다. 체크하고 증빙만 올리면 경영책임자 확인이 담긴 보고서가 나오고, 기록은 5년간 보관됩니다.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="btn-primary px-5 py-2.5 text-base">데모 둘러보기</Link>
            <a href="/api/free-checklist" className="btn-secondary px-5 py-2.5 text-base">반기 점검표 엑셀 받기</a>
          </div>
        </section>

        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <h2 className="text-2xl font-semibold">법이 정한 반기 숙제 7가지</h2>
              <p className="mt-3 text-muted">
                상시근로자 5명 이상 사업장의 경영책임자는 아래 항목을 반기 1회 이상 점검하고, 이행 기록을 5년간 보관해야 합니다(시행령 제13조). 사고가 났을 때 가장 먼저 확인하는 것이 이 기록입니다.
              </p>
            </div>
            <ol className="space-y-2">
              {SEMI.map((t, i) => (
                <li key={t.code} className="flex gap-3 rounded-md border border-line px-4 py-3">
                  <span className="text-sm text-muted">{i + 1}</span>
                  <span>
                    <span className="block font-medium">{t.title}</span>
                    <span className="text-xs text-muted">{t.basis}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-2xl font-semibold">주요 기능</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {STEPS.map((s, i) => (
              <div key={s.t} className="card p-5">
                <p className="text-sm text-brand">{i + 1}</p>
                <h3 className="mt-1 text-lg font-semibold">{s.t}</h3>
                <p className="mt-2 text-muted">{s.d}</p>
              </div>
            ))}
          </div>

          <div className="card mt-10 p-6">
            <p className="text-sm text-muted">보고서 미리보기</p>
            <h3 className="mt-1 text-lg font-semibold">2026년 하반기 안전·보건 의무이행 점검 보고서</h3>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm sm:grid-cols-6">
              {[["전체", 10], ["이행", 7], ["일부 이행", 1], ["미이행", 1], ["해당 없음", 1], ["미점검", 0]].map(([k, v]) => (
                <div key={k as string} className="rounded-md border border-line py-3">
                  <div className="text-xl font-semibold">{v}</div>
                  <div className="text-muted">{k}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1 text-sm">
              <p>5. 법정 안전·보건 교육을 했는지 점검 — <b>일부 이행</b> · 증빙 3건</p>
              <p className="text-muted">개선 조치: 2공장 미이수자 12명 11월 중 교육 — 안전팀 김대리, 기한 2026.11.30</p>
              <p className="pt-2">경영책임자 확인: 대표이사 홍길동 · 2026.12.22 14:10</p>
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-5xl gap-6 px-4 py-14 sm:grid-cols-2">
            <div>
              <h2 className="text-xl font-semibold">만들게 된 배경</h2>
              <ul className="mt-4 space-y-2 text-muted">
                <li>· 반기마다 돌아오는 법정 점검을 엑셀과 메일로 챙기면 마감·증빙·담당자 인수인계가 자주 빠진다</li>
                <li>· 법령이 바뀌어도 어떤 점검 항목에 영향이 있는지 바로 알기 어렵다</li>
                <li>· 그래서 점검 → 증빙 → 확인 → 보관 흐름을 한 화면에 묶었다</li>
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-semibold">하지 않는 일</h2>
              <ul className="mt-4 space-y-2 text-muted">
                <li>· 법률 자문이나 &ldquo;이렇게 하면 처벌받지 않는다&rdquo;는 보장</li>
                <li>· 현장 방문 점검 (전문 기관·컨설턴트의 일입니다)</li>
                <li>· 회사가 하지 않은 점검을 한 것처럼 만드는 기능</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="text-2xl font-semibold">자주 묻는 질문</h2>
          <div className="mt-6 divide-y divide-line">
            {FAQ.map((f) => (
              <details key={f.q} className="py-4">
                <summary className="cursor-pointer font-medium">{f.q}</summary>
                <p className="mt-2 text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-5xl space-y-1 px-4 py-8 text-xs text-muted">
          <p>중대재해 점검노트</p>
          <p>이 앱은 법률 자문을 제공하지 않습니다. 점검 항목은 「중대재해 처벌 등에 관한 법률 시행령」(2025.10.1. 시행)을 바탕으로 정리했으며, 법령 원문은 국가법령정보센터에서 확인하세요.</p>
        </div>
      </footer>
    </div>
  );
}
