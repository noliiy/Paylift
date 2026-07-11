import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional } from "class-validator";

export class ReportDateQueryDto {
  @ApiPropertyOptional({ example: "2026-07-11" })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: "2026-07" })
  @IsOptional()
  month?: string;
}
