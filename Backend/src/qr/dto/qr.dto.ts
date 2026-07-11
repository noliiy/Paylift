import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class CreateQrTokenDto {
  @ApiProperty()
  @IsUUID()
  businessId!: string;

  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiProperty()
  @IsUUID()
  tableId!: string;

  @ApiPropertyOptional({ description: "TTL in minutes", default: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  ttlMinutes?: number;
}

export class ResolveQrTokenDto {
  @ApiProperty({ description: "Plain QR token (hashed server-side)" })
  @IsString()
  token!: string;
}
