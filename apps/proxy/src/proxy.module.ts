import { Module } from '@nestjs/common';
import { WebProxyModule } from '@ubs-platform/web-proxy';

@Module({
  imports: [WebProxyModule],
  controllers: [],
  providers: [],
})
export class ProxyModule {}
