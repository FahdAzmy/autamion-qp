import type { Document } from "mongodb";
import { getMongoDb } from "@/server/db/mongodb";
import type { OrderDocument, OrderLogDocument } from "@/types/order";

export async function ordersCollection() {
  return (await getMongoDb()).collection<OrderDocument>("orders");
}

export async function orderLogsCollection() {
  return (await getMongoDb()).collection<OrderLogDocument>("order_logs");
}

export async function qpTokensCollection() {
  return (await getMongoDb()).collection<Document>("qp_tokens");
}

export async function excelImportsCollection() {
  return (await getMongoDb()).collection<Document>("excel_imports");
}
