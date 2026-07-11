import { Module } from "@nestjs/common";
import { TableSessionsController } from "./table-sessions.controller";
import { TableSessionsService } from "./table-sessions.service";

@Module({
  controllers: [TableSessionsController],
  providers: [TableSessionsService],
  exports: [TableSessionsService],
})
export class TableSessionsModule {}
