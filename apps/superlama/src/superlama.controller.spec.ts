import { Test, TestingModule } from '@nestjs/testing';
import { SuperlamaController } from './superlama.controller';
import { SuperlamaService } from './superlama.service';

describe('SuperlamaController', () => {
  let superlamaController: SuperlamaController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [SuperlamaController],
      providers: [SuperlamaService],
    }).compile();

    superlamaController = app.get<SuperlamaController>(SuperlamaController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(superlamaController.getHello()).toBe('Hello World!');
    });
  });
});
