import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class CreateTableSessionDto {
  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiProperty()
  @IsUUID()
  tableId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  openedByEmployeeId?: string;
}

export class JoinTableSessionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  displayName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seatLabel?: string;
}

export class TransferTableSessionDto {
  @ApiProperty()
  @IsUUID()
  targetTableId!: string;
}

export class MergeTableSessionDto {
  @ApiProperty()
  @IsUUID()
  sourceSessionId!: string;
}
