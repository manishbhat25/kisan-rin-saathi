import { redirect } from "next/navigation";
import { requirePageActor } from "@/server/auth/actor";

/** Role-neutral link used in notifications; sends each user to their own view of the application. */
export default async function ApplicationRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requirePageActor(["FARMER", "GOV_OFFICER", "BANK_OFFICER", "OPERATOR"], `/applications/${id}`);
  if (actor.role === "FARMER") redirect(`/farmer/applications/${id}`);
  if (actor.role === "OPERATOR") redirect(`/operator/applications/${id}`);
  redirect(`/officer/applications/${id}`);
}
