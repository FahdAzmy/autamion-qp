import { NextRequest } from "next/server";
import {
  createLocalOrder,
  listOrders,
  normalizeError,
  sendOrderToQp,
  serializeOrder,
  validateOrderDraft,
} from "@/server/services/orders";
import type { OrderDraft } from "@/types/order";

export const runtime = "nodejs";

function manualDraftFromBody(body: Record<string, unknown>): OrderDraft {
  return {
    source: "manual",
    referenceID: typeof body.referenceID === "string" ? body.referenceID : undefined,
    customer: {
      fullName: String(body.fullName ?? ""),
      phone: String(body.phone ?? ""),
      altPhone: String(body.altPhone ?? ""),
      city: String(body.city ?? ""),
      qpCityId: typeof body.qpCityId === "string" || typeof body.qpCityId === "number" ? body.qpCityId : undefined,
      address: String(body.address ?? ""),
    },
    shipment: {
      orderDate: typeof body.orderDate === "string" && body.orderDate ? body.orderDate : new Date().toISOString(),
      shipmentContents: String(body.shipmentContents ?? ""),
      weight: typeof body.weight === "string" ? body.weight : undefined,
      totalAmount: String(body.totalAmount ?? ""),
      notes: typeof body.notes === "string" ? body.notes : "",
    },
    payment: {
      method: typeof body.paymentMethod === "string" ? body.paymentMethod : undefined,
    },
    items: [],
    rawSourcePayload: body,
  };
}

export async function GET(request: NextRequest) {
  try {
    const result = await listOrders(request.nextUrl.searchParams);

    return Response.json({
      ...result,
      items: result.items.map(serializeOrder),
    });
  } catch (error) {
    return Response.json({ error: normalizeError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const draft = manualDraftFromBody(body);
    const validationErrors = validateOrderDraft(draft);

    if (validationErrors.length > 0) {
      return Response.json({ errors: validationErrors }, { status: 400 });
    }

    const localOrder = await createLocalOrder(draft);
    const updatedOrder = await sendOrderToQp(localOrder);

    return Response.json({ order: updatedOrder ? serializeOrder(updatedOrder) : null }, { status: 201 });
  } catch (error) {
    return Response.json({ error: normalizeError(error) }, { status: 500 });
  }
}
