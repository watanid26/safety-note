import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { company as companyT, db, member as memberT, type Company, type Member } from "@/lib/db";
import { DEV_COOKIE, devLoginEnabled, supabaseConfigured } from "./dev";
import { getServerSupabase } from "./supabase-server";

export interface AuthUser {
  id: string;
  email: string;
}

/** 로그인한 사용자. Supabase Auth(LawChange 와 같은 프로젝트) 또는 개발용 로그인. */
export async function getAuthUser(): Promise<AuthUser | null> {
  // cookies() 를 항상 먼저 읽어 이 함수를 쓰는 화면이 정적으로 굳지 않게 한다.
  const jar = cookies();
  if (devLoginEnabled()) {
    const email = jar.get(DEV_COOKIE)?.value;
    if (email) return { id: `dev:${email}`, email };
  }
  if (!supabaseConfigured()) return null;
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) return null;
  return { id: data.user.id, email: data.user.email.toLowerCase() };
}

export interface MemberContext {
  user: AuthUser;
  member: Member;
  company: Company;
}

/**
 * 사용자의 회사 멤버십을 찾는다.
 * 1) auth user id 로 연결된 멤버
 * 2) 없으면 같은 이메일로 초대된 멤버를 찾아 이번 로그인으로 연결
 */
export async function findMemberContext(user: AuthUser): Promise<MemberContext | null> {
  let row = (
    await db
      .select({ member: memberT, company: companyT })
      .from(memberT)
      .innerJoin(companyT, eq(companyT.id, memberT.companyId))
      .where(eq(memberT.authUserId, user.id))
      .orderBy(asc(memberT.createdAt))
      .limit(1)
  )[0];

  if (!row) {
    const invited = (
      await db
        .select({ member: memberT, company: companyT })
        .from(memberT)
        .innerJoin(companyT, eq(companyT.id, memberT.companyId))
        .where(and(eq(memberT.email, user.email), isNull(memberT.authUserId)))
        .orderBy(asc(memberT.createdAt))
        .limit(1)
    )[0];
    if (invited) {
      const [updated] = await db.update(memberT).set({ authUserId: user.id }).where(eq(memberT.id, invited.member.id)).returning();
      row = { member: updated, company: invited.company };
    }
  }
  if (!row) return null;
  // 마지막 접속 기록은 실패해도 화면을 막지 않는다.
  db.update(memberT).set({ lastSeenAt: new Date() }).where(eq(memberT.id, row.member.id)).catch(() => {});
  return { user, member: row.member, company: row.company };
}

/** /app 화면용: 로그인 + 회사 등록까지 끝난 상태를 보장한다. */
export async function requireMember(): Promise<MemberContext> {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  const ctx = await findMemberContext(user);
  if (!ctx) redirect("/app/onboarding");
  return ctx;
}

/** 수정 권한(OWNER, EDITOR). VIEWER 는 보기만 가능. */
export async function requireEditor(): Promise<MemberContext> {
  const ctx = await requireMember();
  if (ctx.member.role === "VIEWER") throw new Error("보기 전용 권한입니다. 회사 관리자에게 수정 권한을 요청하세요.");
  return ctx;
}

export async function requireOwner(): Promise<MemberContext> {
  const ctx = await requireMember();
  if (ctx.member.role !== "OWNER") throw new Error("회사 관리자만 할 수 있습니다.");
  return ctx;
}
