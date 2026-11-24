import { notFound } from "next/navigation";
import type { Actor } from "@/server/auth/actor";
import { getApplicationView } from "@/server/domain/queries";
import { ApiError } from "@/server/errors";

/** Loads an application for a page; unknown and unauthorized IDs both render the 404 page. */
export async function loadViewOr404(actor: Actor, id: string) {
  try {
    return await getApplicationView(actor, id);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) notFound();
    throw error;
  }
}
