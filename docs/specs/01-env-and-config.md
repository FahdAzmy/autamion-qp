# Environment And Configuration

## Required Environment Variables

```env
MONGODB_URI=
QP_API_BASE_URL=https://qpxpress.com:8001/
QP_USERNAME=
QP_PASSWORD=
EASYORDERS_WEBHOOK_SECRET=
DEFAULT_SHIPMENT_WEIGHT=0.00
QP_CITY_MAP={"القاهرة":1,"الجيزة":2,"اسيوط":3}
```

## Variable Meanings

`MONGODB_URI`

MongoDB connection string.

`QP_API_BASE_URL`

Base URL for the QP Express API. Production value:

```txt
https://qpxpress.com:8001/
```

`QP_USERNAME`

Company username from the QP Express portal.

`QP_PASSWORD`

Company password from the QP Express portal.

`EASYORDERS_WEBHOOK_SECRET`

Secret expected in the EasyOrders webhook request header:

```txt
secret: GENERATED_SECRET
```

`DEFAULT_SHIPMENT_WEIGHT`

Default shipment weight sent to QP Express when no weight is provided. Initial value:

```txt
0.00
```

`QP_CITY_MAP`

Optional JSON object that maps displayed city names from EasyOrders or Excel to QP Express city primary keys. QP may reject city names and require numeric primary keys. If no numeric city id is available, the app stores the city locally but omits `city` from the QP request.

Example:

```env
QP_CITY_MAP={"القاهرة":1,"الجيزة":2,"اسيوط":3}
```

## Security Rules

- Never store `QP_USERNAME` or `QP_PASSWORD` in MongoDB.
- Never log QP credentials.
- Never log `EASYORDERS_WEBHOOK_SECRET`.
- Never expose environment variables to client components.
- Only server-side code can access QP credentials and webhook secrets.

## QP Token Storage

The QP access token may be cached:

- In memory for fast reuse.
- In MongoDB collection `qp_tokens` for reuse across server restarts.

The token is not a permanent credential. If QP returns `401`, refresh it once and retry the failed request.

## Configuration Defaults

Use these defaults unless the admin explicitly provides another value:

- Weight: `DEFAULT_SHIPMENT_WEIGHT`.
- Order date: source order date, or current server time if missing.
- Manual retry count: one immediate retry after token refresh or network failure.
