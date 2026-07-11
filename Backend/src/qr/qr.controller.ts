import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { QrService } from "./qr.service";
import { CreateQrTokenDto, ResolveQrTokenDto } from "./dto/qr.dto";
import { AuditAction, Public } from "../common/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtPayload } from "../common/types";

@ApiTags("qr")
@Controller("qr")
export class QrController {
  constructor(private qr: QrService) {}

  @ApiBearerAuth()
  @Post("tokens")
  @ApiOperation({ summary: "Generate QR token for a table" })
  @AuditAction("QR_TOKEN_CREATE", "QRToken")
  createToken(@Body() dto: CreateQrTokenDto, @CurrentUser() user: JwtPayload) {
    return this.qr.createToken(dto, user);
  }

  @Public()
  @Post("resolve")
  @ApiOperation({ summary: "Resolve QR token (public)" })
  resolve(@Body() dto: ResolveQrTokenDto) {
    return this.qr.resolve(dto);
  }
}
