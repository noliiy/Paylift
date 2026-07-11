import { Injectable } from "@nestjs/common";

@Injectable()
export class CampaignsService {
  findAll() {
    return {
      items: [],
      message: "Campaigns module stub – not yet implemented",
    };
  }
}
