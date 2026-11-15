import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/session";
import { ensureCurrentPeriod } from "@/lib/domain/periods";

export default async function AppHome() {
  const { company } = await requireMember();
  const period = await ensureCurrentPeriod(company);
  redirect(`/app/periods/${period.id}`);
}
