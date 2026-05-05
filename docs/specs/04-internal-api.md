# Internal API

## General Rules

- Use Next.js Route Handlers.
- Use MongoDB for persistence.
- Admin endpoints require admin authentication when auth is added.
- Webhook endpoint validates only the EasyOrders `secret` header.
- All QP calls are synchronous.
- No background jobs.
- No queues.
- No cron.

## `POST /api/orders`

### Purpose

Create a manual order from the admin UI.

### Request Input

Order fields:

- customer full name
- phone
- alt phone, optional
- city
- address
- shipment contents
- total amount
- weight, optional
- notes, optional
- order date, optional
- payment method, optional

### Response Output

Returns:

- created local order
- QP serial if QP create succeeds
- QP error if QP create fails

### Validation Rules

Required:

- full name
- phone
- city
- address
- total amount
- shipment contents

### Error Behavior

- If validation fails, do not call QP.
- Save order as `validation_failed` only if useful for admin review.
- If QP fails, save order with `qp_failed`.

### Collections Touched

- `orders`
- `order_logs`
- `qp_tokens`

### Calls QP Express

Yes. Calls Create Order.

## `GET /api/orders`

### Purpose

List local orders for the admin table.

### Query Parameters

- `page`
- `pageSize`
- `status`
- `phone`
- `name`
- `city`
- `fromDate`
- `toDate`
- `referenceID`

### Response Output

Returns:

- `items`
- `page`
- `pageSize`
- `total`
- `totalPages`

### Validation Rules

- Default `page` to `1`.
- Default `pageSize` to a reasonable value such as `25`.
- Exclude soft-deleted orders by default.

### Error Behavior

Return validation error for invalid page values.

### Collections Touched

- `orders`

### Calls QP Express

No.

## `GET /api/orders/:id`

### Purpose

Return order details.

### Response Output

Returns:

- order
- order logs

### Error Behavior

- Return `404` if order does not exist or is soft deleted.

### Collections Touched

- `orders`
- `order_logs`

### Calls QP Express

No.

## `DELETE /api/orders/:id`

### Purpose

Soft delete a local order.

### Response Output

Returns:

- success flag
- deleted order id

### Validation Rules

- Order must exist.
- Do not physically remove the MongoDB document.

### Error Behavior

- Return `404` if order does not exist.

### Collections Touched

- `orders`
- `order_logs`

### Calls QP Express

No. QP documentation does not provide a delete endpoint.

## `POST /api/orders/:id/sync`

### Purpose

Fetch latest status from QP Express for one order.

### Request Input

No body required.

### Validation Rules

- Order must exist.
- Order must have `qpSerial`.

### Response Output

Returns updated order.

### Error Behavior

- If `qpSerial` is missing, return validation error.
- If QP fails, store `lastError` and return error.

### Collections Touched

- `orders`
- `order_logs`
- `qp_tokens`

### Calls QP Express

Yes. Calls Retrieve Order.

## `POST /api/orders/:id/retry`

### Purpose

Manually retry sending a failed order to QP Express.

### Request Input

No body required.

### Validation Rules

- Order must exist.
- Order must not be soft deleted.
- Order should not already have `qpSerial`.

### Response Output

Returns updated order with QP result.

### Error Behavior

- If QP succeeds, store serial and status.
- If QP fails again, update `lastError`.

### Collections Touched

- `orders`
- `order_logs`
- `qp_tokens`

### Calls QP Express

Yes. Calls Create Order.

## `POST /api/webhook`

### Purpose

Receive EasyOrders webhook.

### Request Input

Headers:

- `Content-Type: application/json`
- `secret: GENERATED_SECRET`

Body:

- EasyOrders order-created payload, or
- EasyOrders status-update payload.

### Validation Rules

- `secret` header must match `EASYORDERS_WEBHOOK_SECRET`.
- For order-created payload, EasyOrders `id` is required.
- For status-update payload, `event_type` and `order_id` are required.

### Response Output

Returns:

- success flag
- local order id when applicable
- duplicate flag when applicable
- QP result when applicable

### Error Behavior

- Invalid secret returns unauthorized.
- Duplicate order returns existing local order.
- QP failure is saved on the order.

### Collections Touched

- `orders`
- `order_logs`
- `qp_tokens`

### Calls QP Express

Yes for order-created payloads.

No for status-update payloads unless implementation later chooses to sync manually.

## `POST /api/upload`

### Purpose

Upload Excel file and create orders from rows.

### Request Input

Multipart form data:

- `file`: `.xlsx`

### Validation Rules

- File must exist.
- File must be an Excel file.
- First sheet must contain supported columns.
- Each row must include required order fields.

### Response Output

Returns import summary:

- total rows
- success count
- failed count
- created order ids
- row errors

### Error Behavior

- If one row fails, continue next row.
- If QP fails for a row, save the local order as `qp_failed` and include row error in summary.

### Collections Touched

- `orders`
- `order_logs`
- `excel_imports`
- `qp_tokens`

### Calls QP Express

Yes. Calls Create Order once per valid row, synchronously.
