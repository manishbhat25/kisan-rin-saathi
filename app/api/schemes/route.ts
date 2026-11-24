export async function GET() {
  return Response.json({
    schemes: [
      {
        id: "kcc",
        name: "Kisan Credit Card",
        owner: "Reserve Bank of India and banks",
        note: "Short-term credit for cultivation. The branch confirms eligibility.",
      },
      {
        id: "interest-subvention",
        name: "Interest subvention on short-term farm credit",
        owner: "Government of India, through banks",
        note: "A lower interest rate may apply on eligible short-term crop loans. The bank confirms the rate.",
      },
    ],
  });
}
