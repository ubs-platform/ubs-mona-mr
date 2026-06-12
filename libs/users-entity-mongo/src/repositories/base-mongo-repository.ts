import { Model, Document } from 'mongoose';
import { IRepositoryOps, IBaseEntity } from '@ubs-platform/users-entity-common';

export class BaseMongoRepository<T extends IBaseEntity, D extends Document & T> implements IRepositoryOps<T> {
    constructor(protected readonly model: Model<D>) {}

    async findById(id: string): Promise<T | null> {
        const result = await this.model.findById(id).exec();
        return result ? (result.toObject() as unknown as T) : null;
    }

    async findAll(): Promise<T[]> {
        const results = await this.model.find().exec();
        return results.map(r => r.toObject() as unknown as T);
    }

    async create(data: Partial<T>): Promise<T> {
        const created = new this.model(data);
        const saved = await created.save();
        return saved.toObject() as unknown as T;
    }

    async update(id: string, data: Partial<T>): Promise<T | null> {
        const updated = await this.model.findByIdAndUpdate(id, data as any, { new: true }).exec();
        return updated ? ((updated as any).toObject() as unknown as T) : null;
    }

    async delete(id: string): Promise<boolean> {
        const result = await this.model.findByIdAndDelete(id).exec();
        return !!result;
    }
}
