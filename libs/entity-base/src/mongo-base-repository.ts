import { Model } from 'mongoose';
import { BaseRepository } from './base-repository';
import { IBaseEntity } from './base-entity';
import { parseMongoQuery } from './query-operators';

function mapMongoDoc<T>(doc: any): T {
  if (!doc) return doc;
  const obj = typeof doc.toObject === 'function' ? doc.toObject({ virtuals: true }) : doc;
  if (obj._id && !obj.id) {
    obj.id = obj._id.toString();
  }
  return obj;
}

export class MongoBaseRepository<T extends IBaseEntity, OPTIONS = any> extends BaseRepository<T, OPTIONS> {
  constructor(protected readonly model: Model<any>) {
    super();
  }

  async findById(id: string, options?: OPTIONS): Promise<T | null> {
    const doc = await this.model.findById(id, null, options as any).exec();
    return doc ? mapMongoDoc<T>(doc) : null;
  }

  async findOne(query: any, options?: OPTIONS): Promise<T | null> {
    const parsed = parseMongoQuery(query);
    const doc = await this.model.findOne(parsed, null, options as any).exec();
    return doc ? mapMongoDoc<T>(doc) : null;
  }

  async find(query: any, options?: OPTIONS): Promise<T[]> {
    const parsed = parseMongoQuery(query);
    const docs = await this.model.find(parsed, null, options as any).exec();
    return docs.map(doc => mapMongoDoc<T>(doc));
  }

  async findAll(options?: OPTIONS): Promise<T[]> {
    const docs = await this.model.find({}, null, options as any).exec();
    return docs.map(doc => mapMongoDoc<T>(doc));
  }

  async create(item: Partial<T>, options?: OPTIONS): Promise<T> {
    const created = new this.model(item);
    const saved = await created.save(options as any);
    return mapMongoDoc<T>(saved);
  }

  async save(item: T, options?: OPTIONS): Promise<T> {
    const id = item.id || (item as any)._id;
    if (id) {
      const updated = await this.model.findByIdAndUpdate(id, item as any, { new: true, ...options as any }).exec();
      if (!updated) {
        throw new Error(`Document with id ${id} not found to save`);
      }
      return mapMongoDoc<T>(updated);
    } else {
      return this.create(item, options);
    }
  }

  async update(id: string, item: Partial<T>, options?: OPTIONS): Promise<T> {
    const updated = await this.model.findByIdAndUpdate(id, item as any, { new: true, ...options as any }).exec();
    if (!updated) {
      throw new Error(`Document with id ${id} not found to update`);
    }
    return mapMongoDoc<T>(updated);
  }

  async delete(id: string, options?: OPTIONS): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id, options as any).exec();
    return result !== null;
  }
}
