import { NextResponse } from "next/server";
import { buildFreeChecklist } from "@/lib/checklist/excel";

export async function GET() {
  const buf = await buildFreeChecklist();
  const name = encodeURIComponent("중대재해처벌법_반기_의무이행_점검표.xlsx");
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${name}`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
