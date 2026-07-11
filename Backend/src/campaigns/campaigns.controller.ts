import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CampaignsService } from "./campaigns.service";

@ApiTags("campaigns")
@ApiBearerAuth()
@Controller("campaigns")
export class CampaignsController {
  constructor(private campaigns: CampaignsService) {}

  @Get()
  @ApiOperation({ summary: "List campaigns (stub)" })
  findAll() {
    return this.campaigns.findAll();
  }
}
