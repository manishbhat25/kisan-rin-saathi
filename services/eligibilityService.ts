import { buildLoans } from "@/lib/eligibility";
import type { FarmerProfile, LoanOption } from "@/lib/types";

export async function checkEligibility(profile: FarmerProfile): Promise<LoanOption[]> {
  try {
    const response = await fetch("/api/eligibility/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    if (!response.ok) throw new Error("eligibility failed");
    const data = (await response.json()) as { loans: LoanOption[] };
    return data.loans;
  } catch {
    return buildLoans(profile);
  }
}
