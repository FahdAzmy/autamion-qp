import { getOrderById, getOrderLogs, normalizeError, serializeLog, serializeOrder, softDeleteOrder } from "@/server/services/orders";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await getOrderById(id);

    if (!order) {
      return Response.json({ error: "Order not found." }, { status: 404 });
    }

    const logs = await getOrderLogs(id);
    return Response.json({ order: serializeOrder(order), logs: logs.map(serializeLog) });
  } catch (error) {
    return Response.json({ error: normalizeError(error) }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await softDeleteOrder(id);

    if (!order) {
      return Response.json({ error: "Order not found." }, { status: 404 });
    }

    return Response.json({ ok: true, id });
  } catch (error) {
    return Response.json({ error: normalizeError(error) }, { status: 500 });
  }
}
