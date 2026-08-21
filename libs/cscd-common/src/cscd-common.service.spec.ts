import { Test, TestingModule } from '@nestjs/testing';
import { CscdCommonService } from './cscd-common.service';

describe('CscdCommonService', () => {
  let service: CscdCommonService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CscdCommonService],
    }).compile();

    service = module.get<CscdCommonService>(CscdCommonService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
