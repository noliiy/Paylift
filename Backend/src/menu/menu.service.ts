import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { RoleCode } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { TenantService } from "../common/utils/tenant.service";
import { JwtPayload } from "../common/types";
import { AppException, ErrorCodes } from "../common/utils/app-exception";
import {
  CreateMenuCategoryDto,
  CreateMenuItemDto,
  UpdateMenuItemDto,
} from "./dto/menu.dto";

@Injectable()
export class MenuService {
  constructor(
    private prisma: PrismaService,
    private tenant: TenantService,
  ) {}

  async getBranchMenu(branchId: string, user: JwtPayload) {
    await this.tenant.assertBranchAccess(
      user.businessId,
      branchId,
      user.role === RoleCode.ADMIN,
    );
    return this.prisma.menu.findMany({
      where: { branchId, isActive: true },
      include: {
        categories: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          include: {
            items: {
              where: { isAvailable: true },
              orderBy: { name: "asc" },
            },
          },
        },
      },
    });
  }

  async createCategory(
    branchId: string,
    dto: CreateMenuCategoryDto,
    user: JwtPayload,
  ) {
    await this.tenant.assertBranchAccess(
      user.businessId,
      branchId,
      user.role === RoleCode.ADMIN,
    );

    let menu = await this.prisma.menu.findFirst({
      where: { branchId, isActive: true },
    });
    if (!menu) {
      menu = await this.prisma.menu.create({
        data: { branchId, name: "Main Menu", isActive: true },
      });
    }

    return this.prisma.menuCategory.create({
      data: {
        menuId: menu.id,
        name: dto.name,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async createItem(branchId: string, dto: CreateMenuItemDto, user: JwtPayload) {
    await this.tenant.assertBranchAccess(
      user.businessId,
      branchId,
      user.role === RoleCode.ADMIN,
    );

    const category = await this.prisma.menuCategory.findUnique({
      where: { id: dto.categoryId },
      include: { menu: true },
    });
    if (!category || category.menu.branchId !== branchId) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        "Category not found in branch",
        404,
      );
    }

    return this.prisma.menuItem.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description ?? "",
        priceCents: dto.priceCents,
        taxRate: new Prisma.Decimal(dto.taxRate),
        isAvailable: dto.isAvailable ?? true,
      },
    });
  }

  async findMenuItem(itemId: string, user: JwtPayload) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id: itemId },
      include: { category: { include: { menu: true } } },
    });
    if (!item) {
      throw new AppException(ErrorCodes.NOT_FOUND, "Menu item not found", 404);
    }
    await this.tenant.assertBranchAccess(
      user.businessId,
      item.category.menu.branchId,
      user.role === RoleCode.ADMIN,
    );
    return item;
  }

  async updateMenuItem(
    itemId: string,
    dto: UpdateMenuItemDto,
    user: JwtPayload,
  ) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id: itemId },
      include: { category: { include: { menu: true } } },
    });
    if (!item) {
      throw new AppException(ErrorCodes.NOT_FOUND, "Menu item not found", 404);
    }
    await this.tenant.assertBranchAccess(
      user.businessId,
      item.category.menu.branchId,
      user.role === RoleCode.ADMIN,
    );

    return this.prisma.menuItem.update({
      where: { id: itemId },
      data: {
        name: dto.name,
        description: dto.description,
        priceCents: dto.priceCents,
        taxRate:
          dto.taxRate !== undefined
            ? new Prisma.Decimal(dto.taxRate)
            : undefined,
        isAvailable: dto.isAvailable,
      },
    });
  }
}
