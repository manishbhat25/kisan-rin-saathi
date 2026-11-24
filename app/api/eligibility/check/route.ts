import { buildLoans } from "@/lib/eligibility";
import { emptyProfile } from "@/lib/profile";
import type { FarmerProfile } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as FarmerProfile | null;
  if (!body) return Response.json({ error: "profile is required" }, { status: 400 });
  const profile = { ...emptyProfile(), ...body, documents: body.documents ?? [] };
  return Response.json({ loans: buildLoans(profile), demo: true });
}
