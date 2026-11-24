export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "document is required" }, { status: 400 });
  }
  return Response.json({
    analysed: false,
    message: "not analysed yet",
    document: body,
  });
}
