# Errors And Testing

## Error Handling Rules

## Validation Errors

If required order data is missing:

- Do not call QP Express.
- Return validation error to UI or import summary.
- Use local status `validation_failed`.
- Store useful error details in `lastError`.

Required fields:

- full name.
- phone.
- city.
- address.
- total amount.
- shipment contents.

## Duplicate EasyOrders Order

If webhook payload has an EasyOrders `id` that already exists:

- Do not create a new local order.
- Do not call QP again.
- Return the existing local order.
- Write a log entry if helpful.

## QP Auth Error

If QP returns `401`:

- Refresh QP token once.
- Retry original request once.
- If retry fails, save `lastError`.

## QP API Error

If QP returns `400` or another validation/API error:

- Save sanitized response in `lastQpResponse`.
- Save readable message in `lastError`.
- Set local status to `qp_failed`.
- Write `qp_failed` log.

## Network Error

If QP request fails because of a network issue:

- Retry once immediately.
- If retry fails, save order as `qp_failed`.
- Admin can retry manually later.

Do not create background retry.

## Excel Row Error

If one Excel row fails:

- Add error to import summary.
- Continue processing next row.
- Do not fail the whole import unless the file cannot be parsed.

## Delete Behavior

Delete is local soft delete only:

- Set `deletedAt`.
- Write `deleted` log.
- Do not call QP.

## Secret Handling

Never log:

- QP username.
- QP password.
- QP token.
- EasyOrders webhook secret.

Sanitize request and response logs before storing them.

## Test Scenarios

## Manual Orders

- Manual order success creates local order and QP serial.
- Manual order validation failure does not call QP.
- Manual order QP failure stores `lastError`.

## EasyOrders Webhook

- Valid secret accepts webhook.
- Invalid secret rejects webhook.
- Missing secret rejects webhook.
- Order-created webhook creates local order.
- Order-created webhook sends order to QP.
- Duplicate EasyOrders id returns existing order and does not call QP.
- Status-update webhook updates local source status if order exists.

## Excel Upload

- Valid `.xlsx` file imports rows.
- Invalid file type is rejected.
- Missing required row field creates row error.
- Valid row creates local order and sends to QP.
- Invalid row does not stop next row.
- Multiline product fields are converted into shipment contents.
- Phone values preserve leading zero.
- Arabic names, cities, addresses, and product names are preserved.

## QP Integration

- Token is fetched when missing.
- Cached token is reused.
- `401` refreshes token once.
- QP create success stores `qpSerial`.
- QP create failure stores `lastError`.
- Retry endpoint sends failed order again.
- Sync endpoint fetches latest QP status.

## Order List

- Pagination works.
- Status filter works.
- Phone filter works.
- Name filter works.
- City filter works.
- Date filter works.
- Reference ID filter works.
- Soft-deleted orders do not appear by default.

## Acceptance Criteria

- All required spec files exist under `docs/specs/`.
- Specs do not include background jobs, queues, cron, or workers.
- Specs describe synchronous manual, webhook, and Excel flows.
- Specs include QP endpoints from the provided documentation.
- Specs include EasyOrders webhook security using `secret` header.
- Specs include MongoDB collections and required indexes.
- Specs include error behavior and test scenarios.
