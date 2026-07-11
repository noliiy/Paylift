import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaymentProvider } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";

export class PaymentAllocationInputDto {
  @ApiProperty()
  @IsUUID()
  orderItemId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerShareId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  participantId?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  amountCents!: number;
}

export class CreatePaymentIntentDto {
  @ApiProperty()
  @IsUUID()
  tableSessionId!: string;

  @ApiProperty()
  @IsUUID()
  payerParticipantId!: string;

  @ApiProperty({ enum: PaymentProvider })
  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  @ApiProperty()
  @IsInt()
  @Min(1)
  amountCents!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  tipCents?: number;

  @ApiProperty({ type: [PaymentAllocationInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationInputDto)
  allocations!: PaymentAllocationInputDto[];
}

export class ConfirmPaymentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerReference?: string;
}

export class CancelPaymentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RefundPaymentDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  amountCents!: number;

  @ApiProperty()
  @IsString()
  reason!: string;
}
