import { BaseRepository } from './base-repository';
import { IBaseEntity } from './base-entity';
import { parseSqlQuery } from './query-operators';

export class SqlBaseRepository<T extends IBaseEntity, OPTIONS = any> extends BaseRepository<T, OPTIONS> {
  constructor(protected readonly repo: any) {
    super();
  }

  async findById(id: string, options?: OPTIONS): Promise<T | null> {
    return this.repo.findOne({ where: { id }, ...options });
  }

  async findOne(query: any, options?: OPTIONS): Promise<T | null> {
    let typeormOps: any = null;
    try {
      typeormOps = require('typeorm');
    } catch (e) {
      throw new Error('TypeORM is not installed, cannot use SqlBaseRepository');
    }
    const parsed = parseSqlQuery(query, typeormOps);
    return this.repo.findOne({ where: parsed, ...options });
  }

  async find(query: any, options?: OPTIONS): Promise<T[]> {
    let typeormOps: any = null;
    try {
      typeormOps = require('typeorm');
    } catch (e) {
      throw new Error('TypeORM is not installed, cannot use SqlBaseRepository');
    }
    const parsed = parseSqlQuery(query, typeormOps);
    return this.repo.find({ where: parsed, ...options });
  }

  async findAll(options?: OPTIONS): Promise<T[]> {
    return this.repo.find({ ...options });
  }

  async create(item: Partial<T>, options?: OPTIONS): Promise<T> {
    const entity = this.repo.create(item);
    return this.repo.save(entity, options);
  }

  async save(item: T, options?: OPTIONS): Promise<T> {
    return this.repo.save(item, options);
  }

  async update(id: string, item: Partial<T>, options?: OPTIONS): Promise<T> {
    await this.repo.update(id, item as any);
    const updated = await this.findById(id, options);
    if (!updated) {
      throw new Error(`Entity with id ${id} not found after update`);
    }
    return updated;
  }

  async delete(id: string, options?: OPTIONS): Promise<boolean> {
    const result = await this.repo.delete(id, options);
    return result.affected !== undefined && result.affected > 0;
  }
}
