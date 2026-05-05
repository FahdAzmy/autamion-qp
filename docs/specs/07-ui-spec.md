# UI Spec

## UI Goal

Provide a simple internal admin interface for managing shipping orders.

The UI should prioritize:

- clear forms.
- readable order table.
- visible status and QP serial.
- simple error visibility.
- manual control over sync and retry.

## Pages

## Orders Table Page

Route:

```txt
/orders
```

Purpose:

Show local orders from MongoDB.

Columns:

- created date
- source
- customer name
- phone
- city
- total amount
- referenceID
- QP serial
- status
- last error summary
- actions

Filters:

- status
- phone
- name
- city
- date
- referenceID

Pagination:

- page number.
- page size.
- total count.

Actions:

- View details.
- Create order.
- Soft delete.
- Sync status.
- Retry failed QP send.

## Create Order Page

Route:

```txt
/orders/new
```

Purpose:

Create one manual order.

Fields:

- full name
- phone
- alt phone, optional
- city
- address
- shipment contents
- weight, optional
- total amount
- notes, optional
- order date, optional
- payment method, optional

Submit behavior:

- Calls `POST /api/orders`.
- Shows QP serial on success.
- Shows validation or QP error on failure.

## Order Details Page

Route:

```txt
/orders/[id]
```

Purpose:

Show one local order and its history.

Sections:

- customer data.
- shipment data.
- payment data.
- QP data.
- source payload.
- logs.
- last error.

Actions:

- Sync status.
- Retry send to QP if failed.
- Soft delete.

## Excel Upload Page

Route:

```txt
/orders/upload
```

Purpose:

Upload Excel file and create orders.

UI elements:

- file input.
- upload button.
- import result summary.
- failed rows table.

Summary fields:

- total rows.
- success count.
- failed count.
- created orders.

Failed row table:

- row number.
- field.
- message.
- raw reference.

## Status Display

Show status labels consistently:

- Pending
- Out For Delivery
- Delivered
- Hold
- Undelivered
- Rejected
- Validation Failed
- QP Failed

## Error Display

For failed QP requests, show:

- readable error message.
- retry button.
- last attempt timestamp.

Do not show:

- QP token.
- QP password.
- webhook secret.

## Language Support

The UI must support Arabic and English text in:

- customer names.
- city names.
- addresses.
- product names.
- notes.

Use UTF-8 everywhere. Display Arabic text as stored.
