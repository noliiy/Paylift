import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { RequestContext } from "../types";

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(
    req: Request & { requestContext?: RequestContext },
    _res: Response,
    next: NextFunction,
  ) {
    req.requestContext = {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    };
    next();
  }
}
