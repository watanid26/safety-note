import { NextResponse } from "next/server";
import { findMemberContext, getAuthUser } from "@/lib/auth/session";
import { buildReport } from "@/lib/report/build";
import { reportToDocx } from "@/lib/report/docx";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const ctx = await findMemberContext(user);
  if (!ctx) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  const report = await buildReport(ctx.company, params.id);
  if (!report) return NextResponse.json({ error: "보고서를 찾을 수 없습니다." }, { status: 404 });
  const buf = await reportToDocx(report);
  const name = encodeURIComponent(`${report.companyName}_${report.title}.docx`);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename*=UTF-8''${name}`,
      "Cache-Control": "private, no-store",
    },
  });
}
