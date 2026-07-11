import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RolesService } from "./roles.service";
import { CreateRoleDto, UpdateRoleDto } from "./dto/role.dto";
import { AuditAction } from "../common/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../common/types";

@ApiTags("roles")
@ApiBearerAuth()
@Controller()
export class RolesController {
  constructor(private roles: RolesService) {}

  @Post("businesses/:businessId/roles")
  @ApiOperation({ summary: "Create role" })
  @AuditAction("ROLE_CREATE", "Role")
  create(
    @Param("businessId") businessId: string,
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roles.create(businessId, dto, user);
  }

  @Get("businesses/:businessId/roles")
  @ApiOperation({ summary: "List roles" })
  findAll(
    @Param("businessId") businessId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roles.findAll(businessId, user);
  }

  @Patch("roles/:roleId")
  @ApiOperation({ summary: "Update role" })
  @AuditAction("ROLE_UPDATE", "Role")
  update(
    @Param("roleId") roleId: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roles.update(roleId, dto, user);
  }
}
