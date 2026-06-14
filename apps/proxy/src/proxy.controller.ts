import { Controller, Get } from '@nestjs/common';
import { ProxyService } from './proxy.service';

@Controller()
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Get()
  getHello(): string {
    return this.proxyService.getHello();
  }
}
