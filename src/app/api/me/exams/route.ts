import { guard } from "@/lib/server/access";
import { handle, requireUser } from "@/lib/server/auth";
import { listExams } from "@/lib/server/user-exams";

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return handle(async () => Response.json({ exams: await listExams(await requireUser()) }), { read: true });
}
