import { QueryOperators, parseMongoQuery, parseSqlQuery } from './query-operators';
import { MongoBaseRepository } from './mongo-base-repository';
import { SqlBaseRepository } from './sql-base-repository';
import { getBaseRepositoryToken, InjectBaseRepository, BaseRepositoryModule } from './decorators';

describe('Query Operators', () => {
  it('should parse mongo query correctly', () => {
    const query = {
      roles: QueryOperators.In(['admin', 'user']),
      age: QueryOperators.GreaterThan(18),
      created: QueryOperators.Between('2026-01-01', '2026-12-31'),
    };

    const parsed = parseMongoQuery(query);
    expect(parsed).toEqual({
      roles: { $in: ['admin', 'user'] },
      age: { $gt: 18 },
      created: { $gte: '2026-01-01', $lte: '2026-12-31' },
    });
  });

  it('should parse sql query correctly', () => {
    const mockTypeorm = {
      In: (val: any) => ({ type: 'in', val }),
      MoreThan: (val: any) => ({ type: 'moreThan', val }),
      Between: (from: any, to: any) => ({ type: 'between', val: [from, to] }),
    };

    const query = {
      roles: QueryOperators.In(['admin', 'user']),
      age: QueryOperators.GreaterThan(18),
      created: QueryOperators.Between('2026-01-01', '2026-12-31'),
    };

    const parsed = parseSqlQuery(query, mockTypeorm);
    expect(parsed).toEqual({
      roles: { type: 'in', val: ['admin', 'user'] },
      age: { type: 'moreThan', val: 18 },
      created: { type: 'between', val: ['2026-01-01', '2026-12-31'] },
    });
  });
});

describe('MongoBaseRepository', () => {
  let mockModel: any;
  let repo: MongoBaseRepository<any>;

  beforeEach(() => {
    mockModel = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({
        toObject: () => ({ _id: '123', ...data }),
      }),
    }));
    mockModel.findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        toObject: () => ({ _id: '123', name: 'John' }),
      }),
    });
    mockModel.find = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        { toObject: () => ({ _id: '123', name: 'John' }) },
      ]),
    });
    repo = new MongoBaseRepository(mockModel);
  });

  it('should findById and map _id to id', async () => {
    const result = await repo.findById('123');
    expect(result).toEqual({ id: '123', _id: '123', name: 'John' });
    expect(mockModel.findById).toHaveBeenCalledWith('123', null, undefined);
  });

  it('should find with operator mapping', async () => {
    const result = await repo.find({ age: QueryOperators.GreaterThan(18) });
    expect(result).toEqual([{ id: '123', _id: '123', name: 'John' }]);
    expect(mockModel.find).toHaveBeenCalledWith({ age: { $gt: 18 } }, null, undefined);
  });
});

describe('SqlBaseRepository', () => {
  let mockRepo: any;
  let repo: SqlBaseRepository<any>;

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn().mockResolvedValue({ id: '123', name: 'John' }),
      find: jest.fn().mockResolvedValue([{ id: '123', name: 'John' }]),
    };
    repo = new SqlBaseRepository(mockRepo);
  });

  it('should findById', async () => {
    const result = await repo.findById('123');
    expect(result).toEqual({ id: '123', name: 'John' });
    expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: '123' } });
  });
});
