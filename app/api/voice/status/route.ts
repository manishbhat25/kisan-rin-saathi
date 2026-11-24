import { sarvamConfigured } from "@/lib/sarvam";

export async function GET() {
  return Response.json({ enabled: sarvamConfigured() });
}
