import type { FarmerProfile } from "@/lib/types";

export async function saveProfile(profile: FarmerProfile): Promise<void> {
  try {
    await fetch("/api/farmer/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
  } catch {
    // The copy on this device is already saved. The server hook can fail quietly.
  }
}
