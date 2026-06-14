import { BadRequestException, Body, Controller, Get, Logger, Post, UseGuards } from '@nestjs/common';
import { IpBlockerService } from './ip-blocker.service';
import { EventPattern } from '@nestjs/microservices';
import { JwtAuthGuard } from '@ubs-platform/users-microservice-helper';
import { Roles, RolesGuard } from '@ubs-platform/users-roles';

interface ManualBanBody {
  ipAddress?: string;
  reason?: string;
}

interface ManualUnbanBody {
  ipAddress?: string;
}

@Controller('ip-blocker')
export class IpBlockerController {
  private readonly logger = new Logger(IpBlockerController.name);
  constructor(private readonly ipBlockerService: IpBlockerService) { }

  @Get()
  async getHello(): Promise<string> {
    return this.ipBlockerService.getHello();
  }

  @Get('health')
  async getHealth() {
    return this.ipBlockerService.getHealth();
  }

  @Get('bans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(["ADMIN"])
  async getBans() {
    return this.ipBlockerService.getActiveBans();
  }


  @Post('ban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(["ADMIN"])
  async ban(@Body() body: ManualBanBody) {
    const ipAddress = body?.ipAddress?.trim();
    if (!ipAddress) {
      throw new BadRequestException('ipAddress is required');
    }

    return this.ipBlockerService.banManually(ipAddress, body.reason);
  }

  @Post('unban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(["ADMIN"])
  async unban(@Body() body: ManualUnbanBody) {
    const ipAddress = body?.ipAddress?.trim();
    if (!ipAddress) {
      throw new BadRequestException('ipAddress is required');
    }

    return this.ipBlockerService.unbanManually(ipAddress);
  }

  @EventPattern('unban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(["ADMIN"])
  async handleUnbanEvent(data: { ipAddress: string }) {
    const ipAddress = data?.ipAddress?.trim();
    if (!ipAddress) {
      this.logger.warn('Received unban event with missing ipAddress');
      return;
    }

    await this.ipBlockerService.unbanManually(ipAddress);
  }


  @EventPattern('ban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(["ADMIN"])
  async handleBanEvent(data: { ipAddress: string; reason?: string }) {
    const ipAddress = data?.ipAddress?.trim();
    if (!ipAddress) {
      this.logger.warn('Received ban event with missing ipAddress');
      return;
    }

    await this.ipBlockerService.banManually(ipAddress, data.reason);
  }
}
