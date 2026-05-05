# Order Flows

## Manual Order Flow

1. Admin opens Create Order page.
2. Admin enters customer and shipment data.
3. Admin submits the form.
4. Backend validates required fields.
5. Backend creates a local `orders` document with `source: manual`.
6. Backend maps local order to QP Create Order request.
7. Backend sends order to QP Express.
8. If QP succeeds:
   - Save `qpSerial`.
   - Save QP status.
   - Save QP response.
   - Write `sent_to_qp` log.
9. If QP fails:
   - Save `lastError`.
   - Set local status to `qp_failed`.
   - Write `qp_failed` log.
10. UI shows success or error.

## EasyOrders Webhook Flow

1. EasyOrders sends `POST /api/webhook`.
2. Backend validates `secret` header against `EASYORDERS_WEBHOOK_SECRET`.
3. If the secret is invalid, reject request.
4. Backend detects payload type:
   - order-created payload.
   - order-status-update payload.
5. For order-created payload:
   - Check duplicate using EasyOrders `id`.
   - If duplicate exists, return existing order.
   - Map payload to local order.
   - Save local order with `source: easyorders`.
   - Send order to QP Express.
   - Store QP result or error.
6. For order-status-update payload:
   - Find local order by `easyOrdersId` or `order_id`.
   - Update source status fields if order exists.
   - Write log.
   - Do not call QP automatically.

## Excel Upload Flow

1. Admin opens Excel Upload page.
2. Admin uploads `.xlsx` file.
3. Backend reads first sheet.
4. Backend detects and normalizes headers.
5. Backend loops through rows synchronously.
6. For each row:
   - Map Excel columns to local order fields.
   - Validate required fields.
   - If invalid, add row error and continue.
   - Save local order with `source: excel`.
   - Send order to QP Express.
   - Store QP result or error.
7. Backend creates an `excel_imports` summary document.
8. UI shows:
   - total rows.
   - successful rows.
   - failed rows.
   - row-level errors.

## Manual Retry Flow

1. Admin opens failed order.
2. Admin clicks Retry.
3. Backend validates order exists and does not already have `qpSerial`.
4. Backend sends order to QP Express again.
5. Store success or latest error.
6. Write `retry_requested` and success/failure logs.

## Manual Sync Flow

1. Admin clicks Sync Status on an order.
2. Backend validates order has `qpSerial`.
3. Backend calls QP Retrieve Order endpoint.
4. Backend updates local QP status fields.
5. Backend writes `synced` log.
6. UI shows updated status.
