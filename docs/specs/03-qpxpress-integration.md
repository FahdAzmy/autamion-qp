# QP Express Integration

## Base URL

Use:

```txt
https://qpxpress.com:8001/
```

The base URL comes from:

```txt
QP_API_BASE_URL
```

## Authentication

### Endpoint

```txt
POST /integration/token
```

### Request

```json
{
  "username": "QP_USERNAME",
  "password": "QP_PASSWORD"
}
```

### Success Response

```json
{
  "token": "<jwtAccessToken>",
  "company_name": "Company Name"
}
```

### Failure Response

QP may return `401` for invalid credentials.

## Auth Header

All QP endpoints except token must include:

```txt
Authorization: Bearer <jwtAccessToken>
Content-Type: application/json
```

## Token Behavior

- Get token using `QP_USERNAME` and `QP_PASSWORD`.
- Reuse cached token when available.
- Store token in memory and optionally `qp_tokens`.
- If token has JWT expiry, use it.
- If expiry is unknown, treat token as expired after a conservative TTL.
- If a QP request returns `401`, refresh token once and retry the request.
- If the retry also fails, save the error on the order.

## Create Order

### Endpoint

```txt
POST /integration/order
```

### Request Fields

- `order_date`
- `shipment_contents`
- `weight`
- `full_name`
- `phone`
- `city`
- `notes`
- `total_amount`
- `address`
- `referenceID`

### Behavior

- Called after local order validation succeeds.
- Store returned `serial` as `orders.qpSerial`.
- Store returned `Order_Delivery_Status` as `orders.qpStatus`.
- Store full sanitized response in `orders.lastQpResponse`.
- Write `sent_to_qp` log on success.
- Write `qp_failed` log on failure.

## Get Orders List

### Endpoint

```txt
GET /integration/order
```

### Supported Query Parameters

- `page_size`
- `page`
- `from_date`
- `to_date`
- `serial`
- `name`
- `phone`
- `status`
- `city`
- `referenceID`

### Purpose

Use this endpoint only when the app needs to compare local data with QP orders or expose QP-side search later.

The main orders table should read from local MongoDB, not directly from QP.

## Retrieve Order

### Endpoint

```txt
GET /integration/order/:order_serial
```

### Purpose

Used by:

- `POST /api/orders/:id/sync`
- Order details refresh action.

### Behavior

- Requires existing `qpSerial`.
- Fetch latest QP order.
- Update local QP status fields.
- Write `synced` log.

## Update Order

### Endpoint

```txt
PATCH /integration/order/:order_serial
```

### Request Fields

Same fields as Create Order, plus QP may accept:

- `serial`

### Constraint

QP documentation says only Pending orders can be updated.

Implementation must:

- Check local status before update when possible.
- If QP rejects update because order is not Pending, save the error and show it in UI.

## Get Update History

### Endpoint

```txt
GET /integration/get_order_update_history
```

### Supported Query Parameters

- `page`
- `page_size`
- `from_date`
- `to_date`

### Purpose

Optional manual use from order details or admin maintenance pages.

Do not create cron sync for this endpoint.

## QP Status Values

Known statuses:

- `Pending`
- `OutForDeliver`
- `Delivered`
- `Hold`
- `Undelivered`

Local app also supports:

- `Rejected`

Map QP strings to local status codes in `src/lib/status.ts` during implementation.
