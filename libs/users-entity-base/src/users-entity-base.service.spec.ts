import { Test, TestingModule } from '@nestjs/testing';
import { UsersEntityBaseService } from './users-entity-base.service';

describe('UsersEntityBaseService', () => {
  let service: UsersEntityBaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersEntityBaseService],
    }).compile();

    service = module.get<UsersEntityBaseService>(UsersEntityBaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
