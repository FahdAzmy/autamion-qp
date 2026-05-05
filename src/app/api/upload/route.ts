import { excelImportsCollection } from "@/server/db/collections";
import { parseExcelOrders } from "@/server/services/excelParser";
import {
  createLocalOrder,
  normalizeError,
  sendOrderToQp,
  serializeOrder,
  validateOrderDraft,
} from "@/server/services/orders";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "Excel file is required." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return Response.json({ error: "Only .xlsx files are supported." }, { status: 400 });
    }

    const parsedRows = parseExcelOrders(await file.arrayBuffer());
    const createdOrders = [];
    const errors = [];

    for (const row of parsedRows) {
      if (!row.draft) {
        errors.push({ rowNumber: row.rowNumber, message: row.error ?? "Could not parse row." });
        continue;
      }

      const validationErrors = validateOrderDraft(row.draft);

      if (validationErrors.length > 0) {
        errors.push({ rowNumber: row.rowNumber, message: validationErrors.join(" "), rawRow: row.draft.rawSourcePayload });
        continue;
      }

      const localOrder = await createLocalOrder(row.draft);
      const updatedOrder = await sendOrderToQp(localOrder);

      if (updatedOrder) {
        createdOrders.push(serializeOrder(updatedOrder));
        if (updatedOrder.lastError) {
          errors.push({ rowNumber: row.rowNumber, message: "QP create failed.", error: updatedOrder.lastError });
        }
      }
    }

    await (await excelImportsCollection()).insertOne({
      fileName: file.name,
      totalRows: parsedRows.length,
      successCount: createdOrders.length,
      failedCount: errors.length,
      createdOrderIds: createdOrders.map((order) => order.id),
      errors,
      createdAt: new Date(),
    });

    return Response.json({
      totalRows: parsedRows.length,
      successCount: createdOrders.length,
      failedCount: errors.length,
      createdOrders,
      errors,
    });
  } catch (error) {
    return Response.json({ error: normalizeError(error) }, { status: 500 });
  }
}
