import { normalizeError, serializeOrder, syncOrderStatus } from "@/server/services/orders";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await syncOrderStatus(id);

    if (!order) {
      return Response.json({ error: "Order not found." }, { status: 404 });
    }

    return Response.json({ order: serializeOrder(order) });
  } catch (error) {
    return Response.json({ error: normalizeError(error) }, { status: 500 });
  }
}
