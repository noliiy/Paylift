import { SetMetadata } from "@nestjs/common";
import { RoleCode } from "@prisma/client";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = "roles";
export const Roles = (...roles: RoleCode[]) => SetMetadata(ROLES_KEY, roles);

export const PERMISSIONS_KEY = "permissions";
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const AUDIT_ACTION_KEY = "auditAction";
export const AuditAction = (action: string, entityType: string) =>
  SetMetadata(AUDIT_ACTION_KEY, { action, entityType });

export { IdempotencyKey } from "./idempotency-key.decorator";
