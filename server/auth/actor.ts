import { redirect } from "next/navigation";
import { routeForOfficerRole, type FinancingRoute, type Role } from "@/lib/domain/constants";
import { forbidden, unauthorized } from "@/server/errors";
import { getSessionUser } from "./session";

export interface Actor {
  id: string;
  role: Role;
  displayName: string;
  email: string;
  /** Set only for officers with an active assignment to the organization that owns this route. */
  route: FinancingRoute | null;
  organizationId: string | null;
  organizationName: string | null;
}

export async function currentActor(): Promise<Actor | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const role = user.role as Role;
  const officerRoute = routeForOfficerRole(role);
  const assignment = officerRoute
    ? user.officerAssignments.find((item) => item.organization.route === officerRoute)
    : undefined;
  return {
    id: user.id,
    role,
    displayName: user.displayName,
    email: user.email,
    route: assignment ? officerRoute : null,
    organizationId: assignment?.organizationId ?? null,
    organizationName: assignment?.organization.name ?? null,
  };
}

export async function requireActor(...roles: Role[]): Promise<Actor> {
  const actor = await currentActor();
  if (!actor) throw unauthorized();
  if (roles.length > 0 && !roles.includes(actor.role)) throw forbidden();
  if ((actor.role === "GOV_OFFICER" || actor.role === "BANK_OFFICER") && !actor.route) {
    throw forbidden("Your officer account is not assigned to a reviewing organization.");
  }
  return actor;
}

export function homeFor(role: Role): string {
  if (role === "FARMER") return "/farmer";
  if (role === "OPERATOR") return "/operator";
  return "/officer";
}

/** For server components: redirects instead of throwing. */
export async function requirePageActor(roles: Role[], next: string): Promise<Actor> {
  const actor = await currentActor();
  if (!actor) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!roles.includes(actor.role)) redirect(homeFor(actor.role));
  return actor;
}
