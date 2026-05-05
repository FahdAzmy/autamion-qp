# QP Express + EasyOrders Full-Stack Integration Plan

## Summary
Build a Next.js App Router application with MongoDB that centralizes order creation from manual UI entry, EasyOrders webhooks, and Excel uploads, then sends orders to QP Express production API at `https://qpxpress.com:8001/`.

The system will store local order data, QP serials, EasyOrders IDs, status, raw source payloads, and append-only history logs. All secrets, including QP username/password, QP base URL, webhook secret, cron secret, MongoDB URI, and admin auth secrets, must live in environment variables.

## System Architecture
Use a layered architecture:

- Admin UI: Next.js App Router pages for order table, order details, manual creation, Excel upload, import review, and status sync.
- API layer: Next.js Route Handlers under `/api/*`.
- Domain services: `OrderService`, `QpExpressService`, `EasyOrdersService`, `ExcelImportService`, `StatusSyncService`, `RetryJobService`.
- Persistence: MongoDB Atlas or self-hosted MongoDB using indexed collections.
- Background processing: Mongo-backed job queue for v1; upgradeable later to BullMQ/Redis, Inngest, Trigger.dev, QStash, or a dedicated worker.
- Observability: structured logs in MongoDB plus application logging for API failures, retries, webhook events, and imports.

QP Express endpoints to support:

- `POST /integration/token`
- `POST /integration/order`
- `GET /integration/order`
- `GET /integration/order/:order_serial`
- `PATCH /integration/order/:order_serial`
- `GET /integration/get_order_update_history`

Use the Postman collection path for update history because it gives the concrete endpoint name.

## MongoDB Schema
`orders`

- `_id`
- `orderNumber`: internal sequential/local reference
- `source`: `manual | easyorders_webhook | excel`
- `sourceIds`: `easyOrdersId`, `easyOrdersExportId`, `excelImportId`, `excelRowNumber`, `externalOrderId`
- `referenceID`: value sent to QP Express
- `customer`: `fullName`, `phone`, `altPhone`, `city`, `address`
- `shipment`: `orderDate`, `shipmentContents`, `weight`, `totalAmount`, `productCost`, `shippingCost`, `paymentMethod`, `notes`
- `items[]`: `name`, `variant`, `sku`, `quantity`, `unitPrice`, `productId`, `variantId`, `raw`
- `qp`: `serial`, `statusName`, `statusCode`, `statusNote`, `totalFees`, `hasReturn`, `returnCount`, `createdDate`, `updatedDate`, `lastRequest`, `lastResponse`
- `status`: normalized internal status, QP status, source status, sync state
- `dedupeKey`
- `deletedAt`, `createdAt`, `updatedAt`

`order_events`

- `orderId`, `type`, `source`, `direction`, `status`, `message`
- sanitized `request`, sanitized `response`, `error`
- `qpSerial`, `referenceID`, `actor`, `createdAt`
- Used for order logs/history and QP update history.

`webhook_events`

- EasyOrders payload, header validation result, `easyOrdersId`, `eventType`
- processing status: `received | duplicate | processed | failed`
- error details and timestamps.

`imports`

- uploaded file metadata, detected columns, selected mapping, row counts
- import status: `previewed | processing | completed | completed_with_errors | failed`
- row-level validation and QP submission summary.

`qp_tokens`

- token, company name, issued time, expiry time if JWT includes `exp`
- refresh status and last failure.

`jobs`

- `type`: `create_qp_order | sync_qp_order | bulk_sync | import_row`
- payload, attempts, next run time, lock owner, status, last error.

`city_mappings`

- local/EasyOrders/Excel city or government names mapped to exact QP city names.

Important indexes:

- unique sparse `qp.serial`
- unique sparse `sourceIds.easyOrdersId`
- unique sparse `sourceIds.externalOrderId`
- unique `dedupeKey`
- compound indexes for `status`, `customer.phone`, `customer.city`, `referenceID`, `createdAt`
- text/search index for customer name if needed.

## Internal API Design
Required endpoints:

- `POST /api/orders`: manual order creation. Validate input, create local order, enqueue/send to QP, return local order with QP result.
- `GET /api/orders`: local DB list with pagination and filters: status, phone, name, city, date range, referenceID.
- `GET /api/orders/:id`: order details, QP data, local logs, import/webhook source metadata.
- `DELETE /api/orders/:id`: soft-delete local order. If already sent to QP, do not imply QP deletion because QP docs do not provide a delete endpoint.
- `POST /api/orders/:id/sync`: fetch latest order from QP retrieve endpoint and QP update history, then update local status/logs.
- `POST /api/webhook`: receive EasyOrders event, validate `secret` header, store event, dedupe, create/update local order, submit to QP.
- `POST /api/upload`: multipart Excel upload. Supports preview mode and commit mode under the same route.

Additional production endpoint:

- `PATCH /api/orders/:id`: edit local order and call QP `PATCH /integration/order/:serial` only if QP status is Pending.

Admin endpoints should require authenticated admin access. Webhook endpoint should not require admin auth, only the EasyOrders secret header.

## Integration Flows
Manual flow:

- Admin fills form.
- Server validates required fields: name, phone, city, address, total amount, shipment contents.
- Create local order with `source=manual`.
- Generate `referenceID`.
- Send QP create order request.
- Store QP serial, status, fees, status note, and response.

EasyOrders webhook flow:

- Validate `secret` header equals `EASYORDERS_WEBHOOK_SECRET`.
- Store raw payload in `webhook_events`.
- If payload has `event_type=order-status-update`, update local EasyOrders source status and add an event.
- If payload is order-created shape, dedupe by EasyOrders `id`.
- Map EasyOrders order into local order.
- Submit to QP immediately when valid; enqueue retry if QP fails transiently.

Excel flow:

- Upload `.xlsx`.
- Parse first sheet by default.
- Normalize headers by trimming, lowercasing, removing extra spaces, and preserving Arabic text.
- Detected sample columns: `ID`, `Status`, `FullName`, `Phone`, `City`, `Address`, `Total Cost`, `Product Cost`, `Shipping Cost`, `Coupon`, `Coupon Discount`, `Product Name`, `Variant`, `Quantity`, `SKU`, `Item Price`, `CreatedAt`, `Extra Data`, `Extra Data2`, `Alt Phone`, `Note`, `Ref`, `Utm Source`, `Utm Campaign`, `Payment Method`, `Payment Status`, `Funnel ID`, `Order ID`, `Referral Code`, `External Order ID`.
- Provide a mapping preview and allow reusable mapping templates.
- On commit, validate each row, create local orders, and process QP submissions as jobs.

## Data Mapping
QP create/update request fields:

- `order_date`: EasyOrders `created_at`; Excel `CreatedAt`; manual form date; fallback current Cairo time.
- `shipment_contents`: joined item names, variants, and quantities.
- `weight`: manual value or default `DEFAULT_SHIPMENT_WEIGHT`, initially `0.00`.
- `full_name`: EasyOrders `full_name`; Excel `FullName`.
- `phone`: normalized Egyptian/local phone string from `phone` or `Phone`.
- `city`: mapped from EasyOrders `government` or Excel `City` through `city_mappings`.
- `notes`: source notes plus payment method, alt phone, and source order reference.
- `total_amount`: EasyOrders `total_cost`; Excel `Total Cost`; manual COD amount.
- `address`: EasyOrders `address`; Excel `Address`.
- `referenceID`: EasyOrders `id` for webhooks; Excel `External Order ID || Order ID || ID`; manual generated `orderNumber`.

EasyOrders payload storage:

- Store top-level fields: `id`, `updated_at`, `created_at`, `store_id`, `cost`, `shipping_cost`, `total_cost`, `status`, `full_name`, `phone`, `government`, `address`, `payment_method`.
- Store `cart_items[]` with product, variant, SKU/taager code, variation props, quantity, and price.
- Store status update payloads separately and link by `order_id`.

Status mapping:

- `1 Pending` maps to QP `Pending`
- `2 Out For Delivery` maps to QP `OutForDeliver` / `Out For Delivery`
- `3 Delivered` maps to QP `Delivered`
- `4 Hold` maps to QP `Hold`
- `5 Undelivered` maps to QP `Undelivered`
- `6 Rejected` is a local supported terminal status even if absent from QP docs.

## Error Handling, Auth, And Retries
QP auth:

- Env vars: `QP_API_BASE_URL`, `QP_USERNAME`, `QP_PASSWORD`.
- Fetch token using `/integration/token`.
- Cache token in memory and `qp_tokens`.
- Parse JWT expiry when available; otherwise refresh on a conservative TTL.
- On QP `401`, refresh token once and retry the request.
- Always send `Authorization: Bearer <token>` and `Content-Type: application/json`.

Error handling:

- Validation errors: do not call QP; mark order/import row as `needs_review`.
- Duplicate orders: return existing local order and log duplicate event.
- QP `400`: mark `qp_rejected` or `needs_review`; store QP message.
- QP network/5xx/rate-limit: retry with exponential backoff and jitter.
- Max retries exceeded: mark job `dead_letter` and order `qp_failed`.
- Redact tokens, passwords, and webhook secrets from all logs.

## Folder Structure
Recommended structure:

- `src/app/(admin)/orders/page.tsx`
- `src/app/(admin)/orders/new/page.tsx`
- `src/app/(admin)/orders/[id]/page.tsx`
- `src/app/(admin)/orders/upload/page.tsx`
- `src/app/api/orders/route.ts`
- `src/app/api/orders/[id]/route.ts`
- `src/app/api/orders/[id]/sync/route.ts`
- `src/app/api/webhook/route.ts`
- `src/app/api/upload/route.ts`
- `src/server/services/qpxpress/*`
- `src/server/services/easyorders/*`
- `src/server/services/excel/*`
- `src/server/services/orders/*`
- `src/server/services/jobs/*`
- `src/server/db/models/*`
- `src/server/validators/*`
- `src/lib/env.ts`
- `src/types/order.ts`

## Test Plan
Cover these scenarios:

- Manual order creates local order and QP order successfully.
- Webhook rejects missing/wrong `secret`.
- Webhook order-created event is idempotent by EasyOrders `id`.
- Webhook status-change event updates local source status.
- Excel upload detects sample columns and previews mappings.
- Excel import handles Arabic names, Arabic cities, multiline product names, multiline quantities, and phone numbers as strings.
- QP token is reused, refreshed on expiry, and refreshed once after `401`.
- QP create failure records logs and schedules retry.
- Sync button updates local status from QP retrieve endpoint.
- Bulk sync/update-history imports QP status history into `order_events`.
- Delete performs local soft delete only.
- Filters work for status, phone, name, city, date, and referenceID.

## Scaling Considerations
Use cursor or indexed pagination for large order tables. Process Excel imports in batches with controlled QP concurrency. Keep webhook response fast by persisting first and processing via jobs. Use MongoDB indexes aggressively for filters and dedupe. Move from Mongo-backed jobs to Redis/queue infrastructure when import volume or webhook throughput grows. Add rate-limit handling around QP API calls. Store raw payloads for audit, but sanitize secrets and cap oversized logs. Use UTF-8 everywhere and Arabic-aware UI display, with explicit city mapping to avoid shipping API rejection.
