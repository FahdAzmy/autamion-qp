import { optionalEnv } from "@/lib/env";
import { buildShipmentContents } from "@/server/services/shipmentContents";
import type { OrderDraft, OrderItem } from "@/types/order";

type EasyOrdersCartItem = {
  id?: string;
  product_id?: string;
  variant_id?: string;
  price?: number;
  quantity?: number;
  product?: {
    name?: string;
    sku?: string;
    taager_code?: string;
  };
  variant?: {
    taager_code?: string;
    variation_props?: Array<{
      variation?: string;
      variation_prop?: string;
    }>;
  };
};

type EasyOrdersPayload = {
  id?: string;
  created_at?: string;
  full_name?: string;
  phone?: string;
  government?: string;
  address?: string;
  city_id?: string | number;
  qp_city_id?: string | number;
  total_cost?: number;
  payment_method?: string;
  status?: string;
  cart_items?: EasyOrdersCartItem[];
};

function describeVariant(item: EasyOrdersCartItem) {
  const props = item.variant?.variation_props ?? [];
  return props
    .map((prop) => [prop.variation, prop.variation_prop].filter(Boolean).join(": "))
    .filter(Boolean)
    .join(" ");
}

function mapItems(items: EasyOrdersCartItem[] = []): OrderItem[] {
  return items.map((item) => ({
    name: item.product?.name ?? "Product",
    variant: describeVariant(item),
    sku: item.variant?.taager_code ?? item.product?.sku ?? item.product?.taager_code,
    quantity: String(item.quantity ?? 1),
    price: item.price,
  }));
}

export function isEasyOrdersStatusUpdate(payload: unknown): payload is {
  event_type: "order-status-update";
  order_id: string;
  old_status?: string;
  new_status?: string;
} {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "event_type" in payload &&
    (payload as { event_type?: unknown }).event_type === "order-status-update"
  );
}

export function easyOrdersToDraft(payload: EasyOrdersPayload): OrderDraft {
  const items = mapItems(payload.cart_items);
  const notes = [`EasyOrders status: ${payload.status ?? "unknown"}`, `Payment: ${payload.payment_method ?? "unknown"}`]
    .filter(Boolean)
    .join("\n");

  return {
    source: "easyorders",
    easyOrdersId: payload.id,
    referenceID: payload.id,
    customer: {
      fullName: payload.full_name ?? "",
      phone: payload.phone ?? "",
      city: payload.government ?? "",
      qpCityId: payload.qp_city_id ?? payload.city_id,
      address: payload.address ?? "",
    },
    shipment: {
      orderDate: payload.created_at,
      shipmentContents: buildShipmentContents(items) || "EasyOrders shipment",
      weight: optionalEnv("DEFAULT_SHIPMENT_WEIGHT", "0.00"),
      totalAmount: payload.total_cost ?? "",
      notes,
    },
    items,
    payment: {
      method: payload.payment_method,
      status: payload.status,
    },
    rawSourcePayload: payload,
  };
}
