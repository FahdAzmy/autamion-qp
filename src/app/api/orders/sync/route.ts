import { normalizeError, syncAllOrderStatuses } from "@/server/services/orders";

export const runtime = "nodejs";

export async function POST() {
  try {
    const result = await syncAllOrderStatuses();

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: normalizeError(error) }, { status: 500 });
  }
}
