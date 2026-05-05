# Data Mapping

## QP Create Order Shape

All sources must map into this QP request shape:

```json
{
  "order_date": "2026-05-04T12:49:58.969+02:00",
  "shipment_contents": "Product x 1",
  "weight": "0.00",
  "full_name": "Customer Name",
  "phone": "01000000000",
  "city": "City Name",
  "notes": "Notes",
  "total_amount": 950,
  "address": "Customer address",
  "referenceID": "local-or-source-reference"
}
```

## Manual To QP

- Admin order date -> `order_date`
- Admin shipment contents -> `shipment_contents`
- Admin weight or `DEFAULT_SHIPMENT_WEIGHT` -> `weight`
- Admin full name -> `full_name`
- Admin phone -> `phone`
- Admin city -> `city`
- Admin notes -> `notes`
- Admin total amount -> `total_amount`
- Admin address -> `address`
- Generated local reference -> `referenceID`

## EasyOrders To Local Order

Top-level EasyOrders fields:

- `id`
- `updated_at`
- `created_at`
- `store_id`
- `cost`
- `shipping_cost`
- `total_cost`
- `status`
- `full_name`
- `phone`
- `government`
- `address`
- `payment_method`
- `cart_items`

Cart item fields to preserve:

- `id`
- `product_id`
- `variant_id`
- `price`
- `quantity`
- `product.name`
- `product.sku`
- `product.taager_code`
- `variant.taager_code`
- `variant.variation_props`

## EasyOrders To QP

- `created_at` -> `order_date`
- `full_name` -> `full_name`
- `phone` -> `phone`
- `government` -> `city`
- `address` -> `address`
- `total_cost` -> `total_amount`
- `id` -> `referenceID`
- `cart_items` -> `shipment_contents`
- `payment_method` -> included in `notes`

## EasyOrders Shipment Contents

Build `shipment_contents` by joining cart items.

Each item should include:

- product name.
- variant information when available.
- quantity.
- SKU or taager code when available.

Example format:

```txt
Product Name - Color Black - Size L x 1
Second Product x 2
```

## Excel Columns To Support

The sample Excel file contains:

- `ID`
- `Status`
- `FullName`
- `Phone`
- `City`
- `Address`
- `Total Cost`
- `Product Cost`
- `Shipping Cost`
- `Coupon`
- `Coupon Discount`
- `Product Name`
- `Variant`
- `Quantity`
- `SKU`
- `Item Price`
- `CreatedAt`
- `Extra Data`
- `Extra Data2`
- `Alt Phone`
- `Note`
- `Ref`
- `Utm Source`
- `Utm Campaign`
- `Payment Method`
- `Payment Status`
- `Funnel ID`
- `Order ID`
- `Referral Code`
- `External Order ID`

## Excel To QP

- `CreatedAt` -> `order_date`
- `FullName` -> `full_name`
- `Phone` -> `phone`
- `City` -> `city`
- `Address` -> `address`
- `Total Cost` -> `total_amount`
- `Product Name`, `Variant`, `Quantity` -> `shipment_contents`
- `External Order ID || Order ID || ID` -> `referenceID`
- `Note`, `Alt Phone`, `Payment Method` -> `notes`
- `DEFAULT_SHIPMENT_WEIGHT` -> `weight`

## Excel Multiline Values

Some Excel cells may contain multiple lines, especially:

- `Product Name`
- `Variant`
- `Quantity`
- `SKU`
- `Item Price`

When values are multiline:

- Split by newline.
- Match product, variant, quantity, SKU, and price by line index.
- If counts do not match, keep raw values and create a readable `shipment_contents`.
- Do not fail the row only because item lines do not perfectly match.

## Phone Normalization

Phones must be stored as strings.

Do not convert phone numbers to numbers.

Basic normalization:

- Trim whitespace.
- Preserve leading zero.
- Preserve `+20` when provided.
- Remove obvious spaces inside the number only if safe.

## Status Mapping

Local status codes:

- `1`: Pending
- `2`: Out For Delivery
- `3`: Delivered
- `4`: Hold
- `5`: Undelivered
- `6`: Rejected
- `0`: validation_failed or qp_failed

QP status strings:

- `Pending` -> `1`
- `OutForDeliver` -> `2`
- `Out For Delivery` -> `2`
- `Delivered` -> `3`
- `Hold` -> `4`
- `Undelivered` -> `5`
- `Rejected` -> `6`
