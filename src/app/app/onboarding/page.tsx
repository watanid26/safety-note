import Link from "next/link";
import { redirect } from "next/navigation";
import { findMemberContext, getAuthUser } from "@/lib/auth/session";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { CompanyFields } from "@/components/CompanyFields";
import { createCompany } from "@/app/app/actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "회사 등록" };

export default async function OnboardingPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  if (await findMemberContext(user)) redirect("/app");

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <Link href="/" className="text-sm text-muted hover:text-ink">← 중대재해 점검노트</Link>
      <h1 className="mt-6 text-2xl font-semibold">회사 정보를 알려 주세요</h1>
      <p className="mt-2 text-sm text-muted">
        입력이 끝나면 이번 반기에 해야 할 점검 항목이 바로 만들어집니다. 30일 동안 무료로 쓸 수 있습니다.
      </p>
      <ActionForm action={createCompany} className="card mt-6 space-y-6 p-6">
        <CompanyFields withMyName />
        <p className="text-xs text-muted">
          상시근로자 5명 미만 사업장은 중대재해처벌법이 적용되지 않습니다. 그래도 안전 점검 기록용으로 쓸 수 있습니다.
        </p>
        <SubmitButton pendingText="만드는 중…">시작하기</SubmitButton>
      </ActionForm>
      <p className="mt-4 text-xs text-muted">로그인: {user.email}</p>
    </main>
  );
}
