import { NextResponse, type NextRequest } from "next/server";
import { runReminders } from "@/lib/notifications/reminders";

export const dynamic = "force-dynamic";

// Vercel Cron 은 Authorization: Bearer $CRON_SECRET 을 붙여 호출한다.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runReminders();
  return NextResponse.json({ ok: true, checked: result.checked, count: result.sent.length, statuses: result.sent.map((s) => s.status) });
}
