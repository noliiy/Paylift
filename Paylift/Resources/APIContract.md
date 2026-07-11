# Paylift REST API Contract

Base URL: `/api/v1`

All write endpoints require HTTPS, bearer access token, tenant isolation by `businessId`, role checks, and audit logging.

## Authentication

- `POST /auth/sign-in-with-apple` — Sign in or register via Apple ID
- `POST /auth/sign-in-with-google` — Sign in or register via Google
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

Request body (Apple / Google):

```json
{
  "displayName": "Emre",
  "email": "emre@example.com",
  "identityToken": "oauth-identity-token"
}
```

> **Note:** The mobile app does not process payments. Payment endpoints exist for POS middleware integration only.

## Businesses and Branches

- `GET /businesses/{businessId}`
- `GET /businesses/{businessId}/branches`
- `GET /branches/{branchId}`
- `GET /branches/{branchId}/dashboard`

## QR and Table Sessions

- `POST /qr/resolve`
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
- `POST /table-sessions/{sessionId}/bill/assign-items`
- `POST /table-sessions/{sessionId}/bill/split-item`
- `POST /table-sessions/{sessionId}/bill/calculate`

Bill splitting tracks who owes what. Actual payment is completed at the restaurant POS.

## Payments (POS middleware only — not used by mobile app)

- `POST /payments/intents`
- `POST /payments/{paymentId}/confirm`
- `POST /payments/{paymentId}/cancel`
- `POST /payments/{paymentId}/refund`
- `GET /payments/{paymentId}`

## Reports

- `GET /reports/daily`
- `GET /reports/monthly`
- `GET /reports/products`
- `GET /reports/tables`
- `GET /reports/employees`

Use **End of Day Sales Summary** for report titles.
