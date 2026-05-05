import { requireEnv } from "@/lib/env";
import { easyOrdersToDraft, isEasyOrdersStatusUpdate } from "@/server/services/easyOrdersMapper";
import {
  createLocalOrder,
  findOrderByEasyOrdersId,
  logOrder,
  normalizeError,
  sendOrderToQp,
  serializeOrder,
  validateOrderDraft,
} from "@/server/services/orders";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const expectedSecret = requireEnv("EASYORDERS_WEBHOOK_SECRET");
    const providedSecret = request.headers.get("secret");

    if (!providedSecret || providedSecret !== expectedSecret) {
      return Response.json({ error: "Invalid webhook secret." }, { status: 401 });
    }

    const payload = (await request.json()) as unknown;

    if (isEasyOrdersStatusUpdate(payload)) {
      const order = await findOrderByEasyOrdersId(payload.order_id);

      if (order?._id) {
        await logOrder(
          order._id,
          "webhook_received",
          `EasyOrders status changed from ${payload.old_status ?? "unknown"} to ${payload.new_status ?? "unknown"}.`,
          payload,
        );
      }

      return Response.json({ ok: true, type: "status_update", matched: Boolean(order) });
    }

    const source = payload as { id?: string };

    if (!source.id) {
      return Response.json({ error: "EasyOrders order id is required." }, { status: 400 });
    }

    const existing = await findOrderByEasyOrdersId(source.id);

    if (existing) {
      return Response.json({ ok: true, duplicate: true, order: serializeOrder(existing) });
    }

    const draft = easyOrdersToDraft(payload as Parameters<typeof easyOrdersToDraft>[0]);
    const validationErrors = validateOrderDraft(draft);

    if (validationErrors.length > 0) {
      return Response.json({ errors: validationErrors }, { status: 400 });
    }

    const localOrder = await createLocalOrder(draft);
    if (localOrder._id) {
      await logOrder(localOrder._id, "webhook_received", "EasyOrders order-created webhook received.", payload);
    }

    const updatedOrder = await sendOrderToQp(localOrder);

    return Response.json({ ok: true, order: updatedOrder ? serializeOrder(updatedOrder) : null });
  } catch (error) {
    return Response.json({ error: normalizeError(error) }, { status: 500 });
  }
}
