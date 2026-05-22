import { IBaseEntity } from './base-entity';

export interface IBaseRepository<T extends IBaseEntity, OPTIONS = any> {
  findById(id: string, options?: OPTIONS): Promise<T | null>;
  findOne(query: any, options?: OPTIONS): Promise<T | null>;
  find(query: any, options?: OPTIONS): Promise<T[]>;
  findAll(options?: OPTIONS): Promise<T[]>;
  create(item: Partial<T>, options?: OPTIONS): Promise<T>;
  save(item: T, options?: OPTIONS): Promise<T>;
  update(id: string, item: Partial<T>, options?: OPTIONS): Promise<T>;
  delete(id: string, options?: OPTIONS): Promise<boolean>;
}

export abstract class BaseRepository<T extends IBaseEntity, OPTIONS = any> implements IBaseRepository<T, OPTIONS> {
  abstract findById(id: string, options?: OPTIONS): Promise<T | null>;
  abstract findOne(query: any, options?: OPTIONS): Promise<T | null>;
  abstract find(query: any, options?: OPTIONS): Promise<T[]>;
  abstract findAll(options?: OPTIONS): Promise<T[]>;
  abstract create(item: Partial<T>, options?: OPTIONS): Promise<T>;
  abstract save(item: T, options?: OPTIONS): Promise<T>;
  abstract update(id: string, item: Partial<T>, options?: OPTIONS): Promise<T>;
  abstract delete(id: string, options?: OPTIONS): Promise<boolean>;
}