import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaymentMode } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

export class AssignBillItemsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID("4", { each: true })
  orderItemIds!: string[];

  @ApiProperty()
  @IsUUID()
  participantId!: string;
}

export class SplitBillItemDto {
  @ApiProperty()
  @IsUUID()
  orderItemId!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID("4", { each: true })
  participantIds!: string[];
}

export class BillAllocationDto {
  @ApiProperty()
  @IsUUID()
  orderItemId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerShareId?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  amountCents!: number;
}

export class CalculateBillDto {
  @ApiProperty({ enum: PaymentMode })
  @IsEnum(PaymentMode)
  mode!: PaymentMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  participantId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  orderItemIds?: string[];

  @ApiPropertyOptional({ description: "Percentage 0-100 for PERCENTAGE mode" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage?: number;

  @ApiPropertyOptional({
    description: "Fixed amount in cents for FIXED_AMOUNT mode",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  fixedAmountCents?: number;

  @ApiPropertyOptional({ type: [BillAllocationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillAllocationDto)
  allocations?: BillAllocationDto[];
}
