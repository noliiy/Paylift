import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { EmployeesService } from "./employees.service";
import { CreateEmployeeDto, UpdateEmployeeDto } from "./dto/employee.dto";
import { AuditAction } from "../common/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../common/types";

@ApiTags("employees")
@ApiBearerAuth()
@Controller()
export class EmployeesController {
  constructor(private employees: EmployeesService) {}

  @Post("businesses/:businessId/employees")
  @ApiOperation({ summary: "Create employee" })
  @AuditAction("EMPLOYEE_CREATE", "Employee")
  create(
    @Param("businessId") businessId: string,
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.employees.create(businessId, dto, user);
  }

  @Get("businesses/:businessId/employees")
  @ApiOperation({ summary: "List employees" })
  findAll(
    @Param("businessId") businessId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.employees.findAll(businessId, user);
  }

  @Patch("employees/:employeeId")
  @ApiOperation({ summary: "Update employee" })
  @AuditAction("EMPLOYEE_UPDATE", "Employee")
  update(
    @Param("employeeId") employeeId: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.employees.update(employeeId, dto, user);
  }
}
