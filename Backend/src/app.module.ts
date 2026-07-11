import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AppConfigModule } from "./config/config.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { CommonModule } from "./common/common.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { BusinessesModule } from "./businesses/businesses.module";
import { BranchesModule } from "./branches/branches.module";
import { EmployeesModule } from "./employees/employees.module";
import { RolesModule } from "./roles/roles.module";
import { TablesModule } from "./tables/tables.module";
import { TableSessionsModule } from "./table-sessions/table-sessions.module";
import { QrModule } from "./qr/qr.module";
import { MenuModule } from "./menu/menu.module";
import { OrdersModule } from "./orders/orders.module";
import { BillModule } from "./bill/bill.module";
import { PaymentsModule } from "./payments/payments.module";
import { ReportsModule } from "./reports/reports.module";
import { HealthModule } from "./health/health.module";
import { UsersModule } from "./users/users.module";
import { CampaignsModule } from "./campaigns/campaigns.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { AuditLogInterceptor } from "./common/interceptors/audit-log.interceptor";

@Module({
  imports: [
    AppConfigModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    RedisModule,
    CommonModule,
    AuditModule,
    AuthModule,
    BusinessesModule,
    BranchesModule,
    EmployeesModule,
    RolesModule,
    TablesModule,
    TableSessionsModule,
    QrModule,
    MenuModule,
    OrdersModule,
    BillModule,
    PaymentsModule,
    ReportsModule,
    HealthModule,
    UsersModule,
    CampaignsModule,
    NotificationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}
