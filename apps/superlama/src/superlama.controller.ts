import { Controller, Get } from '@nestjs/common';
import { SuperlamaService } from './superlama.service';

@Controller()
export class SuperlamaController {
  constructor(private readonly superlamaService: SuperlamaService) {}

  @Get()
  getHello(): string {
    return this.superlamaService.getHello();
  }
}
