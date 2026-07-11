import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor(private readonly config: ConfigService) {
    this.client = new Redis(
      this.config.get<string>("redisUrl") ?? "redis://localhost:6379",
    );
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
