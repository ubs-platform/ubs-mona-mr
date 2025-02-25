import { Test, TestingModule } from '@nestjs/testing';
import { SuperlamaCommonService } from './superlama-common.service';

describe('SuperlamaCommonService', () => {
  let service: SuperlamaCommonService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SuperlamaCommonService],
    }).compile();

    service = module.get<SuperlamaCommonService>(SuperlamaCommonService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
