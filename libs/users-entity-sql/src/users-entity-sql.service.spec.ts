import { Test, TestingModule } from '@nestjs/testing';
import { UsersEntitySqlService } from './users-entity-sql.service';

describe('UsersEntitySqlService', () => {
  let service: UsersEntitySqlService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersEntitySqlService],
    }).compile();

    service = module.get<UsersEntitySqlService>(UsersEntitySqlService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
