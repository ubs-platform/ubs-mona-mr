import { Injectable } from '@nestjs/common';

@Injectable()
export class ProxyService {
  getHello(): string {
    return 'Hello World!';
  }
}
