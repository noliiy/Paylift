import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { BillService } from "./bill.service";
import {
  AssignBillItemsDto,
  CalculateBillDto,
  SplitBillItemDto,
} from "./dto/bill.dto";
import { AuditAction } from "../common/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../common/types";

@ApiTags("bill")
@ApiBearerAuth()
@Controller("table-sessions/:sessionId/bill")
export class BillController {
  constructor(private bill: BillService) {}

  @Get()
  @ApiOperation({ summary: "Get session bill" })
  getBill(
    @Param("sessionId") sessionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.bill.getBill(sessionId, user);
  }

  @Post("assign-items")
  @ApiOperation({ summary: "Assign order items to participant" })
  @AuditAction("BILL_ASSIGN_ITEMS", "OrderItemOwnerShare")
  assignItems(
    @Param("sessionId") sessionId: string,
    @Body() dto: AssignBillItemsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.bill.assignItems(sessionId, dto, user);
  }

  @Post("split-item")
  @ApiOperation({ summary: "Split order item across participants" })
  @AuditAction("BILL_SPLIT_ITEM", "OrderItemOwnerShare")
  splitItem(
    @Param("sessionId") sessionId: string,
    @Body() dto: SplitBillItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.bill.splitItem(sessionId, dto, user);
  }

  @Post("calculate")
  @ApiOperation({ summary: "Calculate payment amount (no DB mutation)" })
  calculate(
    @Param("sessionId") sessionId: string,
    @Body() dto: CalculateBillDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.bill.calculate(sessionId, dto, user);
  }
}
