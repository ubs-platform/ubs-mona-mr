import { Controller, Get } from '@nestjs/common';
import { DevMonolithService } from './dev-monolith.service';

@Controller()
export class DevMonolithController {
  constructor(private readonly devMonolithService: DevMonolithService) {}

  @Get()
  getHello(): string {
    return this.devMonolithService.getHello();
  }
}
