import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Health check" })
  async check() {
    let db = "ok";
    let redis = "ok";

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = "error";
    }

    try {
      await this.redis.client.ping();
    } catch {
      redis = "error";
    }

    const status = db === "ok" && redis === "ok" ? "ok" : "degraded";

    return {
      status,
      timestamp: new Date().toISOString(),
      services: { database: db, redis },
    };
  }
}
