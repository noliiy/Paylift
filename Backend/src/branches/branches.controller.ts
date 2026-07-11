import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { BranchesService } from "./branches.service";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";
import { AuditAction } from "../common/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../common/types";

@ApiTags("branches")
@ApiBearerAuth()
@Controller()
export class BranchesController {
  constructor(private branches: BranchesService) {}

  @Post("businesses/:businessId/branches")
  @ApiOperation({ summary: "Create a branch" })
  @AuditAction("BRANCH_CREATE", "Branch")
  create(
    @Param("businessId") businessId: string,
    @Body() dto: CreateBranchDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.branches.create(businessId, dto, user);
  }

  @Get("branches/:branchId")
  @ApiOperation({ summary: "Get branch by id" })
  findOne(
    @Param("branchId") branchId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.branches.findOne(branchId, user);
  }

  @Patch("branches/:branchId")
  @ApiOperation({ summary: "Update branch" })
  @AuditAction("BRANCH_UPDATE", "Branch")
  update(
    @Param("branchId") branchId: string,
    @Body() dto: UpdateBranchDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.branches.update(branchId, dto, user);
  }

  @Get("branches/:branchId/dashboard")
  @ApiOperation({ summary: "Branch dashboard summary" })
  dashboard(
    @Param("branchId") branchId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.branches.getDashboard(branchId, user);
  }
}
