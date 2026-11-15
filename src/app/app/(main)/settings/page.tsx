import { asc, eq } from "drizzle-orm";
import { db, member as memberT } from "@/lib/db";
import { requireMember } from "@/lib/auth/session";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { CompanyFields } from "@/components/CompanyFields";
import { formatDate } from "@/lib/period/period";
import { inviteMember, removeMember, updateCompany } from "@/app/app/actions";

export const metadata = { title: "설정" };

const ROLE_LABEL: Record<string, string> = { OWNER: "관리자", EDITOR: "점검 담당", VIEWER: "보기 전용" };

export default async function SettingsPage() {
  const { company, member } = await requireMember();
  const members = await db.select().from(memberT).where(eq(memberT.companyId, company.id)).orderBy(asc(memberT.createdAt));
  const isOwner = member.role === "OWNER";

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">설정</h1>

      <section className="card p-5">
        <h2 className="mb-4 text-lg font-semibold">회사 정보</h2>
        {isOwner ? (
          <ActionForm action={updateCompany} className="space-y-4">
            <CompanyFields company={company} />
            <SubmitButton>저장</SubmitButton>
          </ActionForm>
        ) : (
          <p className="text-sm text-muted">회사 정보는 관리자만 바꿀 수 있습니다.</p>
        )}
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold">구성원</h2>
        <p className="text-sm text-muted">추가한 이메일로 로그인하면 바로 이 회사로 연결됩니다. 경영책임자에게는 &lsquo;보기 전용&rsquo;을 주고 경영책임자 이메일을 회사 정보에 넣으면, 보고서 확인만 할 수 있습니다.</p>
        <ul className="mt-3 divide-y divide-line text-sm">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="font-medium">{m.name ?? m.email}</span>
              <span className="text-muted">{m.email}</span>
              <span className="chip border border-line bg-bg text-muted">{ROLE_LABEL[m.role] ?? m.role}</span>
              <span className="text-xs text-muted">{m.authUserId ? `최근 접속 ${formatDate(m.lastSeenAt)}` : "아직 로그인 안 함"}</span>
              {isOwner && m.id !== member.id && (
                <form action={removeMember} className="ml-auto">
                  <input type="hidden" name="memberId" value={m.id} />
                  <button className="btn-ghost px-2 py-1 text-xs">빼기</button>
                </form>
              )}
            </li>
          ))}
        </ul>
        {isOwner && (
          <ActionForm action={inviteMember} resetOnSuccess className="mt-4 grid gap-2 sm:grid-cols-[1fr_160px_140px_auto]">
            <input name="email" type="email" required className="input" placeholder="이메일" />
            <input name="name" maxLength={40} className="input" placeholder="이름" />
            <select name="role" defaultValue="EDITOR" className="input">
              <option value="EDITOR">점검 담당</option>
              <option value="VIEWER">보기 전용</option>
              <option value="OWNER">관리자</option>
            </select>
            <SubmitButton className="btn-secondary">추가</SubmitButton>
          </ActionForm>
        )}
      </section>

    </div>
  );
}
