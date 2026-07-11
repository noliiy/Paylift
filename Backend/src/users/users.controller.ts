import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { UpdateUserDto } from "./dto/user.dto";
import { AuditAction } from "../common/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../common/types";

@ApiTags("users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private users: UsersService) {}

  @Get("me")
  @ApiOperation({ summary: "Get current user profile" })
  me(@CurrentUser() user: JwtPayload) {
    return this.users.findOne(user.sub);
  }

  @Get(":userId")
  @ApiOperation({ summary: "Get user by id" })
  findOne(@Param("userId") userId: string) {
    return this.users.findOne(userId);
  }

  @Patch("me")
  @ApiOperation({ summary: "Update current user" })
  @AuditAction("USER_UPDATE", "User")
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateUserDto) {
    return this.users.update(user.sub, dto);
  }
}
