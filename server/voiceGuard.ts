import { currentActor } from "@/server/auth/actor";
import { ApiError } from "@/server/errors";
import { rateLimit } from "@/server/rateLimit";

export const MAX_SPEAK_CHARS = 1000;
export const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

/**
 * Calls to the paid speech provider need a signed-in user and are rate-limited per user.
 * Returns a JSON response to send back, or null when the call may proceed.
 */
export async function guardPaidVoiceCall(kind: "speak" | "transcribe"): Promise<Response | null> {
  const actor = await currentActor();
  if (!actor) {
    return Response.json({ demo: true, audios: [], text: "", message: "Sign in to use voice features." }, { status: 401 });
  }
  try {
    await rateLimit(`voice-${kind}:${actor.id}`, 60, 60 * 60 * 1000);
  } catch (error) {
    if (error instanceof ApiError) return Response.json({ demo: true, audios: [], text: "", message: error.message }, { status: error.status });
    throw error;
  }
  return null;
}

export function logVoiceFailure(kind: string, error: unknown) {
  console.error(`[voice] ${kind} failed`, error instanceof Error ? error.message : error);
}
