import { Test, TestingModule } from '@nestjs/testing';
import { FileHelperService } from './file-helper.service';

describe('FileHelperService', () => {
  let service: FileHelperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileHelperService],
    }).compile();

    service = module.get<FileHelperService>(FileHelperService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
