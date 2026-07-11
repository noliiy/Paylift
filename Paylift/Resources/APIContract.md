# Paylift REST API Contract

Base URL: `/api/v1`

All write endpoints require HTTPS, bearer access token, tenant isolation by `businessId`, role checks, audit logging, and an `Idempotency-Key` header where noted.

## Authentication

- `POST /auth/sign-in-with-apple`
- `POST /auth/refresh`
- `POST /auth/logout`

## Businesses and Branches

- `GET /businesses/{businessId}`
- `GET /businesses/{businessId}/branches`
- `GET /branches/{branchId}`

## QR and Table Sessions

- `POST /qr/resolve`
  - Body: `businessId`, `branchId`, `tableId`, `token`, optional location/network proof.
  - Returns active `tableSession` or instructions to create one.
- `POST /table-sessions`
- `POST /table-sessions/{sessionId}/join`
- `GET /table-sessions/{sessionId}`
- `POST /table-sessions/{sessionId}/close`

## Menu

- `GET /branches/{branchId}/menu`
- `GET /menu-items/{itemId}`
- `POST /menu-items`
- `PATCH /menu-items/{itemId}`

## Orders

- `POST /table-sessions/{sessionId}/orders`
- `GET /table-sessions/{sessionId}/orders`
- `PATCH /orders/{orderId}/status`
- `POST /orders/{orderId}/cancel`

## Bill Splitting

- `GET /table-sessions/{sessionId}/bill`
- `POST /table-sessions/{sessionId}/bill/split`
- `POST /table-sessions/{sessionId}/bill/assign-items`
- `POST /table-sessions/{sessionId}/bill/calculate`

## Payments

- `POST /payments/intents`
  - Requires `Idempotency-Key`.
  - Locks selected `order_item_owner_shares` or whole `order_items` until success, failure, cancel, or timeout.
- `POST /payments/{paymentId}/confirm`
- `POST /payments/{paymentId}/cancel`
- `POST /payments/{paymentId}/refund`
- `GET /payments/{paymentId}`

Payment provider integrations must tokenize card data outside Paylift systems. Paylift stores provider references, allocation records, status, tips, refunds, and audit events only.

## Reports

- `GET /reports/daily`
- `GET /reports/monthly`
- `GET /reports/products`
- `GET /reports/tables`
- `GET /reports/employees`

Use `Gün Sonu Satış Özeti` wording unless a country-specific fiscal device integration certifies an official Z report.
