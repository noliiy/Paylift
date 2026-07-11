import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AppException, ErrorCodes } from "../common/utils/app-exception";
import { UpdateUserDto } from "./dto/user.dto";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOne(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      include: { customerProfile: true },
    });
    if (!user) {
      throw new AppException(ErrorCodes.NOT_FOUND, "User not found", 404);
    }
    return user;
  }

  async update(userId: string, dto: UpdateUserDto) {
    await this.findOne(userId);
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
  }
}
