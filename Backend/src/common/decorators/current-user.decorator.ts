import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";
import { JwtPayload, RequestContext } from "../types";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    return request.user;
  },
);

export const RequestCtx = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestContext => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { requestContext?: RequestContext }>();
    return request.requestContext ?? {};
  },
);
