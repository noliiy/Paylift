import { Global, Module } from "@nestjs/common";
import { TenantService } from "./utils/tenant.service";

@Global()
@Module({
  providers: [TenantService],
  exports: [TenantService],
})
export class CommonModule {}
