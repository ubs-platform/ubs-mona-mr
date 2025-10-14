import { Test, TestingModule } from '@nestjs/testing';
import { DevMonolithController } from './dev-monolith.controller';
import { DevMonolithService } from './dev-monolith.service';

describe('DevMonolithController', () => {
  let devMonolithController: DevMonolithController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [DevMonolithController],
      providers: [DevMonolithService],
    }).compile();

    devMonolithController = app.get<DevMonolithController>(DevMonolithController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(devMonolithController.getHello()).toBe('Hello World!');
    });
  });
});
