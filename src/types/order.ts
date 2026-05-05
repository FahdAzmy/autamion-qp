import type { ObjectId } from "mongodb";
import type { LocalStatusCode } from "@/lib/status";

export type OrderSource = "manual" | "easyorders" | "excel";

export type OrderItem = {
  name: string;
  variant?: string;
  sku?: string;
  quantity?: string;
  price?: string | number;
};

export type OrderCustomer = {
  fullName: string;
  phone: string;
  altPhone?: string;
  city: string;
  qpCityId?: string | number;
  address: string;
};

export type OrderShipment = {
  orderDate: string;
  shipmentContents: string;
  weight: string;
  totalAmount: string | number;
  notes?: string;
};

export type OrderPayment = {
  method?: string;
  status?: string;
};

export type OrderDocument = {
  _id?: ObjectId;
  source: OrderSource;
  easyOrdersId?: string;
  excelRowId?: string;
  referenceID: string;
  qpSerial?: number | string;
  statusCode: LocalStatusCode;
  statusLabel: string;
  qpStatus?: string;
  customer: OrderCustomer;
  shipment: OrderShipment;
  items: OrderItem[];
  payment?: OrderPayment;
  rawSourcePayload?: unknown;
  lastQpRequest?: unknown;
  lastQpResponse?: unknown;
  lastError?: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
};

export type OrderLogDocument = {
  _id?: ObjectId;
  orderId: ObjectId;
  type:
    | "created"
    | "sent_to_qp"
    | "qp_failed"
    | "synced"
    | "updated"
    | "deleted"
    | "webhook_received"
    | "excel_imported"
    | "retry_requested";
  message: string;
  payload?: unknown;
  createdAt: Date;
};

export type OrderDraft = {
  source: OrderSource;
  easyOrdersId?: string;
  excelRowId?: string;
  referenceID?: string;
  customer: OrderCustomer;
  shipment: Partial<OrderShipment> & {
    shipmentContents: string;
    totalAmount: string | number;
  };
  items?: OrderItem[];
  payment?: OrderPayment;
  rawSourcePayload?: unknown;
};

export type QpCreateOrderPayload = {
  order_date: string;
  shipment_contents: string;
  weight: string;
  full_name: string;
  phone: string;
  city?: number;
  notes: string;
  total_amount: string | number;
  address: string;
  referenceID: string;
};

export type SerializedOrder = Omit<
  OrderDocument,
  "_id" | "createdAt" | "updatedAt" | "deletedAt"
> & {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type SerializedOrderLog = Omit<OrderLogDocument, "_id" | "orderId" | "createdAt"> & {
  id: string;
  orderId: string;
  createdAt: string;
};
