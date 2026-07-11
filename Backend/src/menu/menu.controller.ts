import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { MenuService } from "./menu.service";
import {
  CreateMenuCategoryDto,
  CreateMenuItemDto,
  UpdateMenuItemDto,
} from "./dto/menu.dto";
import { AuditAction } from "../common/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../common/types";

@ApiTags("menu")
@ApiBearerAuth()
@Controller()
export class MenuController {
  constructor(private menu: MenuService) {}

  @Get("branches/:branchId/menu")
  @ApiOperation({ summary: "Get branch menu" })
  getBranchMenu(
    @Param("branchId") branchId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.menu.getBranchMenu(branchId, user);
  }

  @Post("branches/:branchId/menu/categories")
  @ApiOperation({ summary: "Create menu category" })
  @AuditAction("MENU_CATEGORY_CREATE", "MenuCategory")
  createCategory(
    @Param("branchId") branchId: string,
    @Body() dto: CreateMenuCategoryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.menu.createCategory(branchId, dto, user);
  }

  @Post("branches/:branchId/menu/items")
  @ApiOperation({ summary: "Create menu item" })
  @AuditAction("MENU_ITEM_CREATE", "MenuItem")
  createItem(
    @Param("branchId") branchId: string,
    @Body() dto: CreateMenuItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.menu.createItem(branchId, dto, user);
  }

  @Get("menu-items/:itemId")
  @ApiOperation({ summary: "Get menu item" })
  findMenuItem(
    @Param("itemId") itemId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.menu.findMenuItem(itemId, user);
  }

  @Patch("menu-items/:itemId")
  @ApiOperation({ summary: "Update menu item" })
  @AuditAction("MENU_ITEM_UPDATE", "MenuItem")
  updateMenuItem(
    @Param("itemId") itemId: string,
    @Body() dto: UpdateMenuItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.menu.updateMenuItem(itemId, dto, user);
  }
}
