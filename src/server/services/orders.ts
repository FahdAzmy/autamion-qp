import { ObjectId, type Filter } from "mongodb";
import { toQpDateTime } from "@/lib/date";
import { optionalEnv } from "@/lib/env";
import { statusFromQp, statusLabel } from "@/lib/status";
import { resolveQpCityValue } from "@/server/services/cityMapping";
import { orderLogsCollection, ordersCollection } from "@/server/db/collections";
import { createQpOrder, retrieveQpOrder } from "@/server/services/qpxpress";
import type {
  OrderDocument,
  OrderDraft,
  OrderLogDocument,
  QpCreateOrderPayload,
  SerializedOrder,
  SerializedOrderLog,
} from "@/types/order";

const DEFAULT_EMPTY_CITY = "حدد من العنوان";

export function serializeOrder(order: OrderDocument): SerializedOrder {
  return {
    ...order,
    id: order._id?.toString() ?? "",
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    deletedAt: order.deletedAt ? order.deletedAt.toISOString() : null,
  };
}

export function serializeLog(log: OrderLogDocument): SerializedOrderLog {
  return {
    ...log,
    id: log._id?.toString() ?? "",
    orderId: log.orderId.toString(),
    createdAt: log.createdAt.toISOString(),
  };
}

export function validateOrderDraft(draft: OrderDraft) {
  const errors: string[] = [];

  if (!draft.customer.fullName?.trim()) errors.push("Customer full name is required.");
  if (!draft.customer.phone?.trim()) errors.push("Customer phone is required.");
  if (!draft.customer.address?.trim()) errors.push("Customer address is required.");
  if (!String(draft.shipment.totalAmount ?? "").trim()) errors.push("Total amount is required.");
  if (!draft.shipment.shipmentContents?.trim()) {
    errors.push("Shipment contents are required.");
  }

  return errors;
}

export function makeReferenceId(draft: OrderDraft) {
  if (draft.referenceID?.trim()) return draft.referenceID.trim();
  if (draft.easyOrdersId?.trim()) return draft.easyOrdersId.trim();
  if (draft.excelRowId?.trim()) return draft.excelRowId.trim();
  return `LOCAL-${Date.now()}`;
}

export async function logOrder(orderId: ObjectId, type: OrderLogDocument["type"], message: string, payload?: unknown) {
  await (await orderLogsCollection()).insertOne({
    orderId,
    type,
    message,
    payload,
    createdAt: new Date(),
  });
}

export async function createLocalOrder(draft: OrderDraft) {
  const now = new Date();
  const referenceID = makeReferenceId(draft);
  const city = draft.customer.city.trim() || DEFAULT_EMPTY_CITY;
  const document: OrderDocument = {
    source: draft.source,
    easyOrdersId: draft.easyOrdersId,
    excelRowId: draft.excelRowId,
    referenceID,
    statusCode: 1,
    statusLabel: statusLabel(1),
    customer: {
      fullName: draft.customer.fullName.trim(),
      phone: draft.customer.phone.trim(),
      altPhone: draft.customer.altPhone?.trim(),
      city,
      qpCityId: draft.customer.qpCityId,
      address: draft.customer.address.trim(),
    },
    shipment: {
      orderDate: toQpDateTime(draft.shipment.orderDate),
      shipmentContents: draft.shipment.shipmentContents.trim(),
      weight: draft.shipment.weight || optionalEnv("DEFAULT_SHIPMENT_WEIGHT", "0.00"),
      totalAmount: draft.shipment.totalAmount,
      notes: draft.shipment.notes?.trim(),
    },
    items: draft.items ?? [],
    payment: draft.payment,
    rawSourcePayload: draft.rawSourcePayload,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  const result = await (await ordersCollection()).insertOne(document);
  const order = { ...document, _id: result.insertedId };
  await logOrder(result.insertedId, "created", `Created ${draft.source} order.`);
  return order;
}

export function orderToQpPayload(order: OrderDocument): QpCreateOrderPayload {
  return {
    order_date: toQpDateTime(order.shipment.orderDate),
    shipment_contents: order.shipment.shipmentContents,
    weight: order.shipment.weight,
    full_name: order.customer.fullName,
    phone: order.customer.phone,
    city: resolveQpCityValue(order.customer.city, order.customer.qpCityId),
    notes: order.shipment.notes ?? "",
    total_amount: order.shipment.totalAmount,
    address: order.customer.address,
    referenceID: order.referenceID,
  };
}

export async function sendOrderToQp(order: OrderDocument) {
  if (!order._id) throw new Error("Order must have an id before sending to QP.");

  const payload = orderToQpPayload(order);

  try {
    const qpResponse = await createQpOrder(payload);
    const qpStatus =
      qpResponse && typeof qpResponse === "object" && "Order_Delivery_Status" in qpResponse
        ? String(qpResponse.Order_Delivery_Status)
        : "Pending";
    const statusCode = statusFromQp(qpStatus);

    await (await ordersCollection()).updateOne(
      { _id: order._id },
      {
        $set: {
          qpSerial:
            qpResponse && typeof qpResponse === "object" && "serial" in qpResponse
              ? (qpResponse.serial as string | number)
              : undefined,
          qpStatus,
          statusCode,
          statusLabel: statusLabel(statusCode),
          lastQpRequest: payload,
          lastQpResponse: qpResponse,
          lastError: null,
          updatedAt: new Date(),
        },
      },
    );

    await logOrder(order._id, "sent_to_qp", "Order sent to QP Express.", qpResponse);
    return await getOrderById(order._id.toString());
  } catch (error) {
    await (await ordersCollection()).updateOne(
      { _id: order._id },
      {
        $set: {
          statusCode: 0,
          statusLabel: "QP Failed",
          lastQpRequest: payload,
          lastError: normalizeError(error),
          updatedAt: new Date(),
        },
      },
    );

    await logOrder(order._id, "qp_failed", "QP Express create order failed.", normalizeError(error));
    return await getOrderById(order._id.toString());
  }
}

export async function getOrderById(id: string) {
  if (!ObjectId.isValid(id)) return null;

  return (await ordersCollection()).findOne({
    _id: new ObjectId(id),
    deletedAt: null,
  });
}

export async function getOrderLogs(id: string) {
  if (!ObjectId.isValid(id)) return [];

  return (await orderLogsCollection())
    .find({ orderId: new ObjectId(id) })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function findOrderByEasyOrdersId(easyOrdersId: string) {
  return (await ordersCollection()).findOne({
    easyOrdersId,
    deletedAt: null,
  });
}

export async function listOrders(searchParams: URLSearchParams) {
  const page = Math.max(Number(searchParams.get("page") ?? "1"), 1);
  const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize") ?? "25"), 1), 100);
  const filter: Filter<OrderDocument> = { deletedAt: null };

  const status = searchParams.get("status");
  const phone = searchParams.get("phone");
  const name = searchParams.get("name");
  const city = searchParams.get("city");
  const referenceID = searchParams.get("referenceID");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");

  if (status) filter.statusCode = Number(status) as OrderDocument["statusCode"];
  if (phone) filter["customer.phone"] = { $regex: phone, $options: "i" };
  if (name) filter["customer.fullName"] = { $regex: name, $options: "i" };
  if (city) filter["customer.city"] = { $regex: city, $options: "i" };
  if (referenceID) filter.referenceID = { $regex: referenceID, $options: "i" };

  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) filter.createdAt.$lte = new Date(toDate);
  }

  const collection = await ordersCollection();
  const [items, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
    collection.countDocuments(filter),
  ]);

  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(Math.ceil(total / pageSize), 1),
  };
}

export async function softDeleteOrder(id: string) {
  const order = await getOrderById(id);
  if (!order?._id) return null;

  await (await ordersCollection()).updateOne(
    { _id: order._id },
    { $set: { deletedAt: new Date(), updatedAt: new Date() } },
  );
  await logOrder(order._id, "deleted", "Order soft deleted locally.");

  return order;
}

function qpStatusFromResponse(qpResponse: unknown, fallback?: string) {
  return qpResponse && typeof qpResponse === "object" && "Order_Delivery_Status" in qpResponse
    ? String(qpResponse.Order_Delivery_Status)
    : fallback;
}

async function syncQpStatusForOrder(order: OrderDocument, options: { updateWhenUnchanged: boolean }) {
  if (!order._id) throw new Error("Order not found.");
  if (!order.qpSerial) throw new Error("Order does not have a QP serial.");

  const previousStatus = order.qpStatus;
  const previousStatusCode = order.statusCode;
  const qpResponse = await retrieveQpOrder(order.qpSerial);
  const qpStatus = qpStatusFromResponse(qpResponse, order.qpStatus);
  const statusCode = statusFromQp(qpStatus);
  const nextStatusLabel = statusLabel(statusCode);
  const changed =
    qpStatus !== previousStatus || statusCode !== previousStatusCode || nextStatusLabel !== order.statusLabel;

  if (changed || options.updateWhenUnchanged) {
    await (await ordersCollection()).updateOne(
      { _id: order._id },
      {
        $set: {
          qpStatus,
          statusCode,
          statusLabel: nextStatusLabel,
          lastQpResponse: qpResponse,
          lastError: null,
          updatedAt: new Date(),
        },
      },
    );

    await logOrder(
      order._id,
      "synced",
      changed
        ? `Order status changed from ${previousStatus ?? statusLabel(previousStatusCode)} to ${
            qpStatus ?? nextStatusLabel
          }.`
        : "Order status checked with QP Express; no status change.",
      qpResponse,
    );
  }

  return {
    orderId: order._id.toString(),
    referenceID: order.referenceID,
    qpSerial: order.qpSerial,
    previousStatus,
    previousStatusCode,
    nextStatus: qpStatus,
    nextStatusCode: statusCode,
    changed,
  };
}

export async function syncOrderStatus(id: string) {
  const order = await getOrderById(id);
  if (!order?._id) throw new Error("Order not found.");

  await syncQpStatusForOrder(order, { updateWhenUnchanged: true });

  return await getOrderById(id);
}

export async function syncAllOrderStatuses() {
  const collection = await ordersCollection();
  const orders = await collection.find({ deletedAt: null }).toArray();
  const results: Array<Awaited<ReturnType<typeof syncQpStatusForOrder>>> = [];
  const errors: Array<{
    orderId: string;
    referenceID: string;
    qpSerial?: string | number;
    error: ReturnType<typeof normalizeError>;
  }> = [];
  let skipped = 0;

  for (const order of orders) {
    if (!order._id || !order.qpSerial) {
      skipped += 1;
      continue;
    }

    try {
      results.push(await syncQpStatusForOrder(order, { updateWhenUnchanged: false }));
    } catch (error) {
      const normalizedError = normalizeError(error);
      errors.push({
        orderId: order._id.toString(),
        referenceID: order.referenceID,
        qpSerial: order.qpSerial,
        error: normalizedError,
      });

      await collection.updateOne(
        { _id: order._id },
        {
          $set: {
            lastError: normalizedError,
            updatedAt: new Date(),
          },
        },
      );
      await logOrder(order._id, "qp_failed", "QP Express status sync failed.", normalizedError);
    }
  }

  return {
    total: orders.length,
    checked: results.length,
    updated: results.filter((result) => result.changed).length,
    unchanged: results.filter((result) => !result.changed).length,
    skipped,
    failed: errors.length,
    results,
    errors,
  };
}

export function normalizeError(error: unknown) {
  if (error instanceof Error) {
    const extra =
      typeof error === "object" && "response" in error
        ? { response: (error as { response?: unknown }).response }
        : {};

    return {
      message: error.message,
      ...extra,
    };
  }

  return { message: String(error) };
}
