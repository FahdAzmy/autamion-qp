# Overview

## Goal

Build a simple internal admin application using Next.js App Router and MongoDB to manage shipping orders and send them to QP Express.

The application supports three order creation sources:

- Manual order entry from the admin UI.
- EasyOrders webhook events.
- Excel file uploads.

## Integrations

The system integrates with:

- QP Express production API: `https://qpxpress.com:8001/`
- QP Express production portal: `https://qpxpress.com/`
- EasyOrders webhooks.
- Uploaded Excel files.

## Boundaries

This is not a deployment-heavy or high-scale platform. Keep the implementation straightforward and maintainable.

Do not add:

- Background workers.
- Job queues.
- Cron sync.
- Redis.
- External workflow tools.
- Complex event processing.

All QP Express calls happen synchronously inside the API request that triggered the action.

## Core Behavior

- Admin can create an order manually.
- EasyOrders can send a webhook to create an order.
- Admin can upload an Excel file and create many orders.
- Each created order is saved in MongoDB.
- Each valid order is sent to QP Express using the Create Order endpoint.
- QP serial and status are saved locally.
- Failed QP requests are saved on the order and retried manually from the UI.
- Admin can sync a single order status manually.
- Admin can soft delete a local order.

## Secrets

All secrets and credentials must be stored in `.env`.

Secrets must not be:

- Hardcoded.
- Stored in source control.
- Logged.
- Returned to the frontend.

## Source Of Truth

These files under `docs/specs/` are the source of truth for implementation.

If `PLAN.md` conflicts with these specs, follow these specs.
