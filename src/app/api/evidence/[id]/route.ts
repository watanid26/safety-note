import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { checkItem, db, evidence, period } from "@/lib/db";
import { findMemberContext, getAuthUser } from "@/lib/auth/session";
import { openEvidenceFile } from "@/lib/storage/evidence-storage";

// 증빙 파일 내려받기. 같은 회사 구성원만 받을 수 있다.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const ctx = await findMemberContext(user);
  if (!ctx) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const [row] = await db
    .select({ ev: evidence })
    .from(evidence)
    .innerJoin(checkItem, eq(checkItem.id, evidence.itemId))
    .innerJoin(period, eq(period.id, checkItem.periodId))
    .where(and(eq(evidence.id, params.id), eq(evidence.kind, "FILE"), eq(period.companyId, ctx.company.id)))
    .limit(1);
  const ev = row?.ev;
  if (!ev?.storagePath) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });

  const opened = await openEvidenceFile(ev.storagePath);
  if (opened.kind === "redirect") return NextResponse.redirect(opened.url);
  const name = encodeURIComponent(ev.fileName ?? "file");
  return new NextResponse(new Uint8Array(opened.data), {
    headers: {
      "Content-Type": ev.mimeType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${name}`,
      "Cache-Control": "private, no-store",
    },
  });
}
