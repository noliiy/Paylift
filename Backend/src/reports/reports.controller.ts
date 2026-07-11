import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ReportsService } from "./reports.service";
import { ReportDateQueryDto } from "./dto/report-query.dto";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../common/types";

@ApiTags("reports")
@ApiBearerAuth()
@Controller("branches/:branchId/reports")
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get("daily")
  @ApiOperation({ summary: "Daily sales report" })
  daily(
    @Param("branchId") branchId: string,
    @Query() query: ReportDateQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reports.dailyReport(branchId, query.date, user);
  }

  @Get("monthly")
  @ApiOperation({ summary: "Monthly sales report" })
  monthly(
    @Param("branchId") branchId: string,
    @Query() query: ReportDateQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reports.monthlyReport(branchId, query.month, user);
  }

  @Get("products")
  @ApiOperation({ summary: "Product sales report" })
  products(
    @Param("branchId") branchId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reports.productsReport(branchId, user);
  }

  @Get("tables")
  @ApiOperation({ summary: "Table usage report" })
  tables(@Param("branchId") branchId: string, @CurrentUser() user: JwtPayload) {
    return this.reports.tablesReport(branchId, user);
  }

  @Get("employees")
  @ApiOperation({ summary: "Employee activity report" })
  employees(
    @Param("branchId") branchId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reports.employeesReport(branchId, user);
  }
}
