import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { TablesService } from "./tables.service";
import { CreateTableDto, UpdateTableDto } from "./dto/table.dto";
import { AuditAction } from "../common/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../common/types";

@ApiTags("tables")
@ApiBearerAuth()
@Controller()
export class TablesController {
  constructor(private tables: TablesService) {}

  @Post("branches/:branchId/tables")
  @ApiOperation({ summary: "Create table" })
  @AuditAction("TABLE_CREATE", "RestaurantTable")
  create(
    @Param("branchId") branchId: string,
    @Body() dto: CreateTableDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tables.create(branchId, dto, user);
  }

  @Get("branches/:branchId/tables")
  @ApiOperation({ summary: "List tables" })
  findAll(
    @Param("branchId") branchId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tables.findAll(branchId, user);
  }

  @Patch("tables/:tableId")
  @ApiOperation({ summary: "Update table" })
  @AuditAction("TABLE_UPDATE", "RestaurantTable")
  update(
    @Param("tableId") tableId: string,
    @Body() dto: UpdateTableDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tables.update(tableId, dto, user);
  }

  @Post("tables/:tableId/disable")
  @ApiOperation({ summary: "Disable table" })
  @AuditAction("TABLE_DISABLE", "RestaurantTable")
  disable(@Param("tableId") tableId: string, @CurrentUser() user: JwtPayload) {
    return this.tables.disable(tableId, user);
  }
}
