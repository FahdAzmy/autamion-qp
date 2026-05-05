import {
  getOrderById,
  logOrder,
  normalizeError,
  sendOrderToQp,
  serializeOrder,
} from "@/server/services/orders";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await getOrderById(id);

    if (!order?._id) {
      return Response.json({ error: "Order not found." }, { status: 404 });
    }

    if (order.qpSerial) {
      return Response.json({ error: "Order already has a QP serial. Use sync instead." }, { status: 400 });
    }

    await logOrder(order._id, "retry_requested", "Manual retry requested from admin UI.");
    const updatedOrder = await sendOrderToQp(order);

    return Response.json({ order: updatedOrder ? serializeOrder(updatedOrder) : null });
  } catch (error) {
    return Response.json({ error: normalizeError(error) }, { status: 500 });
  }
}
