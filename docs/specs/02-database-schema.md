# Database Schema

## Database

Use MongoDB.

Use timestamps on all main collections:

- `createdAt`
- `updatedAt`

Use soft delete for orders:

- `deletedAt`

## Collection: `orders`

Stores local orders from manual entry, EasyOrders, and Excel imports.

### Fields

`_id`

MongoDB object id.

`source`

Order source:

- `manual`
- `easyorders`
- `excel`

`easyOrdersId`

EasyOrders order id when source is EasyOrders.

`excelRowId`

Excel source row id when source is Excel. Usually from the Excel `ID` column.

`referenceID`

Internal reference sent to QP Express.

`qpSerial`

QP Express order serial returned by Create Order.

`statusCode`

Local numeric status:

- `1`: Pending
- `2`: Out For Delivery
- `3`: Delivered
- `4`: Hold
- `5`: Undelivered
- `6`: Rejected
- `0`: validation_failed or qp_failed when no QP status exists

`statusLabel`

Local readable status label.

`qpStatus`

Raw QP status string from `Order_Delivery_Status`.

`customer`

Object:

- `fullName`
- `phone`
- `altPhone`
- `city`
- `address`

`shipment`

Object:

- `orderDate`
- `shipmentContents`
- `weight`
- `totalAmount`
- `notes`

`items`

Array of order items:

- `name`
- `variant`
- `sku`
- `quantity`
- `price`

`payment`

Object:

- `method`
- `status`

`rawSourcePayload`

Original EasyOrders payload or Excel row data.

`lastQpRequest`

Last sanitized request body sent to QP Express.

`lastQpResponse`

Last sanitized response body received from QP Express.

`lastError`

Last error message or object.

`createdAt`

Creation timestamp.

`updatedAt`

Last update timestamp.

`deletedAt`

Soft delete timestamp. `null` means active.

## Collection: `order_logs`

Stores simple append-only order history.

### Fields

- `_id`
- `orderId`
- `type`
- `message`
- `payload`
- `createdAt`

### Log Types

- `created`
- `sent_to_qp`
- `qp_failed`
- `synced`
- `updated`
- `deleted`
- `webhook_received`
- `excel_imported`
- `retry_requested`

## Collection: `qp_tokens`

Stores latest QP Express token.

### Fields

- `_id`
- `token`
- `companyName`
- `createdAt`
- `expiresAt`

`expiresAt` is optional. If JWT expiry can be decoded, store it. Otherwise use a conservative local TTL in the token service.

## Collection: `excel_imports`

Stores uploaded Excel import summary.

### Fields

- `_id`
- `fileName`
- `totalRows`
- `successCount`
- `failedCount`
- `createdOrderIds`
- `errors`
- `createdAt`

Each `errors` entry should include:

- `rowNumber`
- `field`
- `message`
- `rawRow`

## Required Indexes

Create indexes for:

- `orders.qpSerial`
- `orders.easyOrdersId`
- `orders.referenceID`
- `orders.customer.phone`
- `orders.customer.city`
- `orders.statusCode`
- `orders.createdAt`

Recommended unique sparse indexes:

- `orders.qpSerial`
- `orders.easyOrdersId`

Do not use hard delete for normal order deletion.
