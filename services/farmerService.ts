import type { FarmerProfile } from "@/lib/types";

/**
 * The voice assistant keeps its working profile on this device only. Details reach the
 * server when the farmer signs in and confirms them on the application form.
 */
export async function saveProfile(_profile: FarmerProfile): Promise<void> {}
