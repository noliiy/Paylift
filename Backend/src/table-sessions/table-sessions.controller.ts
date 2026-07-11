import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { TableSessionsService } from "./table-sessions.service";
import {
  CreateTableSessionDto,
  JoinTableSessionDto,
  MergeTableSessionDto,
  TransferTableSessionDto,
} from "./dto/table-session.dto";
import { AuditAction } from "../common/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../common/types";

@ApiTags("table-sessions")
@ApiBearerAuth()
@Controller("table-sessions")
export class TableSessionsController {
  constructor(private sessions: TableSessionsService) {}

  @Post()
  @ApiOperation({ summary: "Open table session" })
  @AuditAction("SESSION_CREATE", "TableSession")
  create(@Body() dto: CreateTableSessionDto, @CurrentUser() user: JwtPayload) {
    return this.sessions.create(dto, user);
  }

  @Post(":sessionId/join")
  @ApiOperation({ summary: "Join table session" })
  @AuditAction("SESSION_JOIN", "SessionParticipant")
  join(
    @Param("sessionId") sessionId: string,
    @Body() dto: JoinTableSessionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sessions.join(sessionId, dto, user);
  }

  @Get(":sessionId")
  @ApiOperation({ summary: "Get table session" })
  findOne(
    @Param("sessionId") sessionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sessions.findOne(sessionId, user);
  }

  @Post(":sessionId/close")
  @ApiOperation({ summary: "Close table session" })
  @AuditAction("SESSION_CLOSE", "TableSession")
  close(
    @Param("sessionId") sessionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sessions.close(sessionId, user);
  }

  @Post(":sessionId/transfer-table")
  @ApiOperation({ summary: "Transfer session to another table" })
  @AuditAction("SESSION_TRANSFER", "TableSession")
  transfer(
    @Param("sessionId") sessionId: string,
    @Body() dto: TransferTableSessionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sessions.transferTable(sessionId, dto, user);
  }

  @Post(":sessionId/merge")
  @ApiOperation({ summary: "Merge another session into this one" })
  @AuditAction("SESSION_MERGE", "TableSession")
  merge(
    @Param("sessionId") sessionId: string,
    @Body() dto: MergeTableSessionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sessions.merge(sessionId, dto, user);
  }
}
