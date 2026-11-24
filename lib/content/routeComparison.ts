export interface ComparisonRow {
  topic: string;
  government: string;
  bank: string;
}

/**
 * Plain-language comparison used on the public comparison page and API.
 * These are demonstration descriptions, not official terms of any scheme or bank.
 */
export const ROUTE_COMPARISON = {
  disclaimer:
    "This comparison describes the two demonstration routes in this prototype. Real government schemes and bank loans have their own rules, interest rates and benefits that vary by provider, product, state and time. Always confirm with the scheme office or bank before deciding.",
  rows: [
    {
      topic: "Purpose",
      government:
        "Support for small and marginal farmers: crop inputs, irrigation, or small equipment.",
      bank: "Credit for crop production, equipment, land development, dairy or storage, sized to your repayment capacity.",
    },
    {
      topic: "Potential benefits",
      government: "Designed for farmers with small landholdings and limited income. May include subsidised or non-repayable support, depending on the scheme.",
      bank: "Larger amounts are possible and can be used for a wider range of purposes. A good repayment record builds your credit history.",
    },
    {
      topic: "Drawbacks",
      government: "Strict eligibility limits on land, income and amount. Limited budgets mean support is not guaranteed.",
      bank: "Must be repaid with interest. Missed payments harm your credit history. Larger loans usually need security.",
    },
    {
      topic: "Who is likely to qualify (demo criteria)",
      government: "Age 18–70, up to 5 acres cultivated, farm income up to ₹2.5 lakh a year, a bank account, and no unmet conditions on earlier schemes.",
      bank: "Age 21–65, total repayments within half of monthly income, loan within 3× yearly income, no defaulted loans, and security for loans above ₹1.6 lakh.",
    },
    {
      topic: "Documents",
      government: "Identity proof, land record or tenancy agreement, bank passbook.",
      bank: "Identity proof, income proof, 6-month bank statement, land record, and collateral documents if security is offered.",
    },
    {
      topic: "Interest",
      government: "Depends on the scheme. Some support is a grant, some is a subsidised loan. This prototype does not quote rates.",
      bank: "Set by each bank and product. This prototype does not quote rates; ask the bank for the current rate.",
    },
    {
      topic: "Repayment",
      government: "Depends on the scheme; grants are not repaid, but scheme conditions must be followed.",
      bank: "Monthly or seasonal instalments over the agreed period.",
    },
    {
      topic: "Collateral",
      government: "Usually not required for this kind of support.",
      bank: "Not needed for small loans in this demo (up to ₹1.6 lakh). Larger loans need security worth at least the loan amount.",
    },
    {
      topic: "Processing stages",
      government: "Submit → officer review → eligibility assessment → corrections if needed → decision.",
      bank: "Submit → officer review → repayment-capacity assessment → corrections if needed → decision.",
    },
    {
      topic: "Flexibility",
      government: "Fixed support categories and limits.",
      bank: "Amount and repayment period can be adjusted to fit your income.",
    },
    {
      topic: "Review process",
      government: "Reviewed by an agriculture department officer. The model result is advice only; the officer decides.",
      bank: "Reviewed by a bank officer. The model result is advice only; the officer decides.",
    },
  ] satisfies ComparisonRow[],
};
