import { read, utils } from "xlsx";
import { toQpDateTime } from "@/lib/date";
import { optionalEnv } from "@/lib/env";
import { buildShipmentContents } from "@/server/services/shipmentContents";
import type { OrderDraft, OrderItem } from "@/types/order";

type ExcelRow = Record<string, unknown>;

export type ParsedExcelOrder = {
  rowNumber: number;
  draft?: OrderDraft;
  error?: string;
};

function normalizeProductSearchText(text: string) {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627")
    .replace(/[\u0649]/g, "\u064A")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parsedExcelOrderMatchesProduct(row: ParsedExcelOrder, productName: string) {
  const query = normalizeProductSearchText(productName);

  if (!query) return false;

  return (
    row.draft?.items?.some((item) => normalizeProductSearchText(item.name).includes(query)) ??
    false
  );
}

export function filterParsedExcelOrdersByProduct(rows: ParsedExcelOrder[], productName: string) {
  return rows.filter((row) => parsedExcelOrderMatchesProduct(row, productName));
}

function value(row: ExcelRow, key: string) {
  const entry = row[key];
  return entry === null || entry === undefined ? "" : String(entry).trim();
}

function dateValue(row: ExcelRow, key: string) {
  const entry = row[key];

  if (entry instanceof Date) {
    return toQpDateTime(entry);
  }

  return toQpDateTime(value(row, key));
}

function firstValue(row: ExcelRow, keys: string[]) {
  for (const key of keys) {
    const found = value(row, key);
    if (found) return found;
  }

  return "";
}

function splitLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseItems(row: ExcelRow): OrderItem[] {
  const names = splitLines(value(row, "Product Name"));
  const variants = splitLines(value(row, "Variant"));
  const quantities = splitLines(value(row, "Quantity"));
  const skus = splitLines(value(row, "SKU"));
  const prices = splitLines(value(row, "Item Price"));
  const count = Math.max(names.length, variants.length, quantities.length, skus.length, prices.length, 1);

  return Array.from({ length: count }, (_, index) => ({
    name: names[index] ?? names[0] ?? "Product",
    variant: variants[index],
    quantity: quantities[index] ?? quantities[0] ?? "1",
    sku: skus[index],
    price: prices[index],
  }));
}

function buildShippingNote(row: ExcelRow) {
  const shippingCost = value(row, "Shipping Cost");

  return shippingCost ? `شحن ${shippingCost}` : "";
}

export function parseExcelOrders(buffer: ArrayBuffer): ParsedExcelOrder[] {
  const workbook = read(buffer, { type: "array", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [{ rowNumber: 0, error: "Excel file has no sheets." }];
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = utils.sheet_to_json<ExcelRow>(sheet, { defval: "" });

  return rows.map((row, index) => {
    const rowNumber = index + 2;
    const items = parseItems(row);
    const referenceID = firstValue(row, ["External Order ID", "Order ID", "ID"]);

    const draft: OrderDraft = {
      source: "excel",
      excelRowId: value(row, "ID"),
      referenceID,
      customer: {
        fullName: value(row, "FullName"),
        phone: value(row, "Phone"),
        altPhone: value(row, "Alt Phone"),
        city: value(row, "City"),
        qpCityId: firstValue(row, ["QP City ID", "City ID", "CityId", "city_id"]),
        address: value(row, "Address"),
      },
      shipment: {
        orderDate: dateValue(row, "CreatedAt"),
        shipmentContents: buildShipmentContents(items),
        weight: optionalEnv("DEFAULT_SHIPMENT_WEIGHT", "0.00"),
        totalAmount: value(row, "Total Cost"),
        notes: buildShippingNote(row),
      },
      items,
      payment: {
        method: value(row, "Payment Method"),
        status: value(row, "Payment Status"),
      },
      rawSourcePayload: row,
    };

    return { rowNumber, draft };
  });
}
