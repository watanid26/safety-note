import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { DEV_COOKIE, supabaseConfigured } from "@/lib/auth/dev";
import { getServerSupabase } from "@/lib/auth/supabase-server";

export async function POST(req: NextRequest) {
  cookies().delete(DEV_COOKIE);
  if (supabaseConfigured()) await getServerSupabase().auth.signOut();
  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}
