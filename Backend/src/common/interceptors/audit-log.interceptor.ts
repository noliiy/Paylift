import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, tap } from "rxjs";
import { Request } from "express";
import { AUDIT_ACTION_KEY } from "../decorators";
import { AuditService } from "../../audit/audit.service";
import { JwtPayload } from "../types";

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<
      { action: string; entityType: string } | undefined
    >(AUDIT_ACTION_KEY, context.getHandler());
    if (!meta) return next.handle();

    const request = context.switchToHttp().getRequest<
      Request & {
        user?: JwtPayload;
        requestContext?: { ipAddress?: string; userAgent?: string };
      }
    >();
    const method = request.method;
    if (!["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (result) => {
        const user = request.user;
        const param = (key: string) => {
          const value = request.params[key];
          return Array.isArray(value) ? value[0] : value;
        };
        const businessId =
          user?.businessId ??
          (result as { businessId?: string })?.businessId ??
          param("businessId");
        if (!businessId) return;

        const entityId =
          (result as { id?: string })?.id ??
          param("id") ??
          param("sessionId") ??
          param("paymentId");

        await this.audit.log({
          businessId,
          branchId: user?.branchId ?? param("branchId"),
          actorUserId: user?.sub,
          action: meta.action,
          entityType: meta.entityType,
          entityId,
          metadata: { method, path: request.path, body: request.body },
          ctx: {
            ipAddress: request.ip,
            userAgent: request.headers["user-agent"],
          },
        });
      }),
    );
  }
}
