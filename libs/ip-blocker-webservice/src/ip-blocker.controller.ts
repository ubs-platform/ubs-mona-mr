import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { IpBlockerService } from './ip-blocker.service';

interface ManualBanBody {
  ipAddress?: string;
  reason?: string;
}

interface ManualUnbanBody {
  ipAddress?: string;
}

@Controller('ip-blocker')
export class IpBlockerController {
  constructor(private readonly ipBlockerService: IpBlockerService) {}

  @Get()
  async getHello(): Promise<string> {
    return this.ipBlockerService.getHello();
  }

  @Get('health')
  async getHealth() {
    return this.ipBlockerService.getHealth();
  }

  @Get('bans')
  async getBans() {
    return this.ipBlockerService.getActiveBans();
  }

  @Post('ban')
  async ban(@Body() body: ManualBanBody) {
    const ipAddress = body?.ipAddress?.trim();
    if (!ipAddress) {
      throw new BadRequestException('ipAddress is required');
    }

    return this.ipBlockerService.banManually(ipAddress, body.reason);
  }

  @Post('unban')
  async unban(@Body() body: ManualUnbanBody) {
    const ipAddress = body?.ipAddress?.trim();
    if (!ipAddress) {
      throw new BadRequestException('ipAddress is required');
    }

    return this.ipBlockerService.unbanManually(ipAddress);
  }
}
