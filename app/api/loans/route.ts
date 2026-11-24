export async function GET() {
  return Response.json({
    loans: [
      {
        id: "kcc",
        name: "Kisan Credit Card",
        lender: "Banks under the KCC scheme",
        purpose: "Crop cultivation and short-term farm needs",
      },
      {
        id: "sbi-kcc",
        name: "State Bank of India – KCC",
        lender: "State Bank of India",
        purpose: "Kisan Credit Card through SBI",
      },
      {
        id: "term",
        name: "Agriculture Term Loan",
        lender: "Scheduled banks",
        purpose: "Equipment or land improvement",
      },
    ],
  });
}
