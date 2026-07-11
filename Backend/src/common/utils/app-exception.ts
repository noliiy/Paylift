import { HttpException, HttpStatus } from "@nestjs/common";
import { ApiErrorBody } from "../types";

export class AppException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: Record<string, unknown>,
  ) {
    const body: ApiErrorBody = {
      error: { code, message, details },
    };
    super(body, status);
  }
}

export const ErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  TENANT_ISOLATION: "TENANT_ISOLATION",
  QR_TOKEN_EXPIRED: "QR_TOKEN_EXPIRED",
  QR_TOKEN_REVOKED: "QR_TOKEN_REVOKED",
  QR_TOKEN_INVALID: "QR_TOKEN_INVALID",
  SESSION_CLOSED: "SESSION_CLOSED",
  PAYMENT_ITEM_LOCKED: "PAYMENT_ITEM_LOCKED",
  PAYMENT_ITEM_ALREADY_PAID: "PAYMENT_ITEM_ALREADY_PAID",
  PAYMENT_ALREADY_PROCESSED: "PAYMENT_ALREADY_PROCESSED",
  IDEMPOTENCY_CONFLICT: "IDEMPOTENCY_CONFLICT",
  ORDER_INVALID_TRANSITION: "ORDER_INVALID_TRANSITION",
  SPLIT_TOTAL_MISMATCH: "SPLIT_TOTAL_MISMATCH",
} as const;
