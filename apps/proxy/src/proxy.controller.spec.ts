import { Test, TestingModule } from '@nestjs/testing';
import { ProxyController } from './proxy.controller';
import { ProxyService } from './proxy.service';

describe('ProxyController', () => {
  let proxyController: ProxyController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ProxyController],
      providers: [ProxyService],
    }).compile();

    proxyController = app.get<ProxyController>(ProxyController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(proxyController.getHello()).toBe('Hello World!');
    });
  });
});
