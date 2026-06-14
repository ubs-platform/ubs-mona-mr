import { Test, TestingModule } from '@nestjs/testing';
import { WebProxyService } from './web-proxy.service';

describe('WebProxyService', () => {
  let service: WebProxyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebProxyService],
    }).compile();

    service = module.get<WebProxyService>(WebProxyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
