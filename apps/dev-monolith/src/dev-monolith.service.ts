import { Injectable } from '@nestjs/common';

@Injectable()
export class DevMonolithService {
  getHello(): string {
    return 'Hello World!';
  }
}
