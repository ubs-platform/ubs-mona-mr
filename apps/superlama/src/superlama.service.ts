import { Injectable } from '@nestjs/common';

@Injectable()
export class SuperlamaService {
  getHello(): string {
    return 'Hello World!';
  }
}
