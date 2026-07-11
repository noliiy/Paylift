import { RoleCode } from "@prisma/client";

export interface JwtPayload {
  sub: string;
  email?: string | null;
  role?: RoleCode;
  businessId?: string;
  branchId?: string;
  employeeId?: string;
}

export interface RequestContext {
  userId?: string;
  businessId?: string;
  branchId?: string;
  employeeId?: string;
  role?: RoleCode;
  ipAddress?: string;
  userAgent?: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
