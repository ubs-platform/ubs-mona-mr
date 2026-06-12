import { Test, TestingModule } from '@nestjs/testing';
import { UsersEntityCommonService } from './users-entity-common.service';

describe('UsersEntityCommonService', () => {
  let service: UsersEntityCommonService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersEntityCommonService],
    }).compile();

    service = module.get<UsersEntityCommonService>(UsersEntityCommonService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
