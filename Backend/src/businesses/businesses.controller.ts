import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { BusinessesService } from "./businesses.service";
import { CreateBusinessDto } from "./dto/create-business.dto";
import { UpdateBusinessDto } from "./dto/update-business.dto";
import { AuditAction } from "../common/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../common/types";

@ApiTags("businesses")
@ApiBearerAuth()
@Controller("businesses")
export class BusinessesController {
  constructor(private businesses: BusinessesService) {}

  @Post()
  @ApiOperation({ summary: "Create a business" })
  @AuditAction("BUSINESS_CREATE", "Business")
  create(@Body() dto: CreateBusinessDto) {
    return this.businesses.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "List businesses for current user" })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.businesses.findAll(user);
  }

  @Patch(":businessId")
  @ApiOperation({ summary: "Update a business" })
  @AuditAction("BUSINESS_UPDATE", "Business")
  update(
    @Param("businessId") businessId: string,
    @Body() dto: UpdateBusinessDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.businesses.update(businessId, dto, user);
  }

  @Get(":businessId/branches")
  @ApiOperation({ summary: "List branches for a business" })
  findBranches(
    @Param("businessId") businessId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.businesses.findBranches(businessId, user);
  }
}
