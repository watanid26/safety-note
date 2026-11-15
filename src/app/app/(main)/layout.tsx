import Link from "next/link";
import { requireMember } from "@/lib/auth/session";
import { NavLinks } from "./NavLinks";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { company, user, member } = await requireMember();
  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/app" className="font-semibold">점검노트</Link>
          <span className="text-sm text-muted">{company.name}{company.siteName ? ` · ${company.siteName}` : ""}</span>
          <NavLinks />
          <div className="ml-auto flex items-center gap-3 text-sm text-muted">
            <span className="hidden sm:inline">{user.email}{member.role === "VIEWER" ? " (보기 전용)" : ""}</span>
            <form action="/logout" method="post">
              <button className="btn-ghost px-2 py-1">로그아웃</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
